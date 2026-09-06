import { DetectedSignal, PerformanceMetrics, BusinessTargets, ConfidenceLevel } from '../../types';
import { calculatePercentChange, formatPercent, formatRupiah } from '../../utils/formatters';

export interface RuleContext {
  entityName: string;
  entityType: 'account' | 'campaign' | 'adset' | 'ad';
  current: PerformanceMetrics;
  previous: PerformanceMetrics;
  targets: BusinessTargets;
}

export interface RuleDef {
  id: string;
  name: string;
  evaluate: (ctx: RuleContext) => DetectedSignal | null;
}

/**
 * Null-aware type guard to verify if a metric is a valid finite number.
 * Ensures UNKNOWN (null/undefined) is never coerced to ZERO.
 */
export function hasKnownMetric(val: number | null | undefined): val is number {
  return val !== null && val !== undefined && !isNaN(val);
}

/**
 * Null-aware evidence formatting helpers.
 * Never converts missing values into fake zeroes.
 */
export function formatEvidenceNumber(val: number | null | undefined, unit: string = ''): string {
  if (!hasKnownMetric(val)) return 'N/A';
  return unit ? `${val.toLocaleString('id-ID')} ${unit}` : val.toLocaleString('id-ID');
}

export function formatEvidencePurchases(purchases: number | null | undefined): string {
  if (!hasKnownMetric(purchases)) return 'Data belum tersedia (N/A)';
  return `${purchases} order`;
}

export function formatEvidenceSpend(spend: number | null | undefined): string {
  if (!hasKnownMetric(spend)) return 'N/A';
  return formatRupiah(spend);
}

export function formatEvidenceRoas(roas: number | null | undefined): string {
  if (!hasKnownMetric(roas)) return 'N/A';
  return `${roas.toFixed(2)}x`;
}

export function formatEvidenceCtr(ctr: number | null | undefined): string {
  if (!hasKnownMetric(ctr)) return 'N/A';
  return `${ctr}%`;
}

export function formatEvidenceCpa(cpa: number | null | undefined): string {
  if (!hasKnownMetric(cpa)) return 'N/A';
  return formatRupiah(cpa);
}

export function formatEvidenceFrequency(freq: number | null | undefined): string {
  if (!hasKnownMetric(freq)) return 'N/A';
  return freq.toFixed(2);
}

export const RULES: RuleDef[] = [
  // 1. INSUFFICIENT DATA RULE (Top Priority check)
  {
    id: 'INSUFFICIENT_DATA',
    name: 'Perlindungan Data Belum Cukup',
    evaluate: (ctx) => {
      const { current, targets } = ctx;

      // When spend or impressions are unmeasured/unavailable
      if (current.dataAvailability === 'UNAVAILABLE' || current.spend === null || current.impressions === null) {
        return {
          type: 'INSUFFICIENT_DATA',
          title: 'Data Belum Tersedia',
          description: 'Metrik performa belum tercatat atau belum tersedia pada Meta Graph API untuk periode ini.',
          severity: 'neutral',
          confidence: 'High',
          evidence: ['Metrik spend / impresi belum tercatat pada rentang tanggal ini.'],
        };
      }

      // If spend is very low (< 0.7x Target CPA) and purchases <= 1 or null, or impressions < 800
      const isLowSpend = current.spend < targets.targetCpa * 0.7;
      const isFewImpressions = current.impressions < 800;
      const isFewPurchases = current.purchases === null || current.purchases <= 1;

      if ((isLowSpend && isFewPurchases) || (isFewImpressions && current.spend < targets.breakEvenCpa)) {
        return {
          type: 'INSUFFICIENT_DATA',
          title: 'Data Belum Cukup',
          description: 'Aktivitas iklan masih dalam fase pengumpulan data awal. Jangan membuat perubahan drastis.',
          severity: 'neutral',
          confidence: 'High',
          evidence: [
            `Spend saat ini: ${formatEvidenceSpend(current.spend)} (Target CPA: ${formatRupiah(targets.targetCpa)})`,
            `Total Impresi: ${current.impressions.toLocaleString('id-ID')} (di bawah ambang batas stabilitas 800+)`,
            `Penjualan: ${formatEvidencePurchases(current.purchases)}`,
          ],
        };
      }
      return null;
    },
  },

  // 2. CAMPAIGN NOT SPENDING RULE
  // Triggers ONLY if dataAvailability is AVAILABLE/PARTIAL AND spend === 0
  {
    id: 'CAMPAIGN_NOT_SPENDING',
    name: 'Kampanye Tidak Menghabiskan Anggaran (Zero Spend)',
    evaluate: (ctx) => {
      const { current } = ctx;
      if (current.dataAvailability === 'UNAVAILABLE' || current.spend === null) {
        return null; // Not enough data / unavailable, not zero spending
      }

      if (current.spend === 0) {
        return {
          type: 'CAMPAIGN_NOT_SPENDING',
          title: 'Kampanye Tidak Spending (Zero Spend)',
          description: 'Iklan dalam status aktif tetapi tidak ada anggaran yang dibelanjakan atau impresi yang dihasilkan dalam periode ini.',
          severity: 'warning',
          confidence: 'High',
          evidence: [
            'Total Belanja: Rp0 (Belum ada anggaran terpakai)',
            `Total Impresi: ${formatEvidenceNumber(current.impressions, 'tayangan')}`,
            'Status Data: Insight tersedia terkonfirmasi',
          ],
        };
      }
      return null;
    },
  },

  // 3. HIGH SPEND NO PURCHASE RULE
  // Strictly requires: spend != null, purchases === 0, dataAvailability != UNAVAILABLE, and spend >= threshold
  {
    id: 'HIGH_SPEND_NO_PURCHASE',
    name: 'Belanja Tinggi Tanpa Penjualan',
    evaluate: (ctx) => {
      const { current, targets } = ctx;
      
      // If purchases is null (conversion data unavailable) or spend is null, rule MUST NOT trigger!
      if (current.spend === null || current.purchases === null || current.dataAvailability === 'UNAVAILABLE') {
        return null;
      }

      const threshold = Math.max(targets.breakEvenCpa, targets.targetCpa * 1.5, 150_000);

      // Must strictly have purchases === 0
      if (current.spend >= threshold && current.purchases === 0) {
        const confidence: ConfidenceLevel = current.spend >= targets.breakEvenCpa * 1.8 ? 'High' : 'Medium';
        return {
          type: 'HIGH_SPEND_NO_PURCHASE',
          title: 'High Spend Without Purchase',
          description: 'Iklan telah menghabiskan budget melebihi batas toleransi tanpa menghasilkan pembelian sama sekali.',
          severity: 'critical',
          confidence,
          evidence: [
            `Total Spend: ${formatRupiah(current.spend)} tanpa ada pembelian (0 order)`,
            `Batas toleransi Break-even CPA: ${formatRupiah(targets.breakEvenCpa)}`,
            `Total Klik: ${formatEvidenceNumber(current.clicks, 'klik')}`,
          ],
        };
      }
      return null;
    },
  },

  // 4. CREATIVE FATIGUE RULE
  // Requires valid evidence across impressions, CTR, frequency, and CPC
  {
    id: 'CREATIVE_FATIGUE',
    name: 'Deteksi Kelelahan Materi Iklan (Creative Fatigue)',
    evaluate: (ctx) => {
      const { current, previous } = ctx;
      if (
        current.impressions === null || 
        previous.impressions === null || 
        current.impressions < 1000 || 
        previous.impressions < 500 ||
        current.ctr === null ||
        previous.ctr === null ||
        current.frequency === null ||
        previous.frequency === null ||
        current.cpc === null ||
        previous.cpc === null
      ) {
        return null;
      }

      const ctrChange = calculatePercentChange(current.ctr, previous.ctr);
      const freqChange = calculatePercentChange(current.frequency, previous.frequency);
      const cpcChange = calculatePercentChange(current.cpc, previous.cpc);

      if (ctrChange === null || freqChange === null || cpcChange === null) return null;

      const ctrDropped = ctrChange <= -18;
      const freqIncreased = freqChange >= 15 || current.frequency >= 2.6;
      const cpcSpiked = cpcChange >= 15;

      if (ctrDropped && freqIncreased && cpcSpiked) {
        let confidence: ConfidenceLevel = 'Medium';
        if (ctrChange <= -30 && current.frequency >= 3.0 && cpcChange >= 25) {
          confidence = 'High';
        } else if (ctrChange > -22) {
          confidence = 'Low';
        }

        return {
          type: 'CREATIVE_FATIGUE',
          title: 'Possible Creative Fatigue',
          description: 'Audiens mulai jenuh dengan visual/hook iklan ini. Respon klik merosot sementara frekuensi tayang bertambah.',
          severity: 'critical',
          confidence,
          evidence: [
            `CTR turun ${formatPercent(Math.abs(ctrChange))} (${previous.ctr}% → ${current.ctr}%)`,
            `Frequency naik ke ${current.frequency.toFixed(2)} (sebelumnya ${previous.frequency.toFixed(2)})`,
            `CPC naik ${formatPercent(cpcChange)} (${formatRupiah(previous.cpc)} → ${formatRupiah(current.cpc)})`,
          ],
        };
      }
      return null;
    },
  },

  // 5. CPA SPIKE RULE
  // Strictly requires CPA != null and verified purchase count > 0 in both periods
  {
    id: 'CPA_SPIKE',
    name: 'Lonjakan Biaya Akuisisi (CPA Spike)',
    evaluate: (ctx) => {
      const { current, previous, targets } = ctx;
      if (
        current.cpa === null || 
        previous.cpa === null || 
        current.purchases === null || 
        previous.purchases === null || 
        current.purchases === 0 || 
        previous.purchases === 0
      ) {
        return null;
      }

      const cpaChange = calculatePercentChange(current.cpa, previous.cpa);
      if (cpaChange === null) return null;

      const isAboveBreakEven = current.cpa > targets.breakEvenCpa;

      if (cpaChange >= 25 || (isAboveBreakEven && current.cpa > previous.cpa)) {
        const severity = isAboveBreakEven ? 'critical' : 'warning';
        return {
          type: 'CPA_SPIKE',
          title: 'CPA Meningkat Tajam',
          description: `Biaya per penjualan melonjak ${formatPercent(cpaChange)} dan ${isAboveBreakEven ? 'telah melampaui batas break-even CPA' : 'mendekati batas target'}.`,
          severity,
          confidence: current.purchases >= 3 ? 'High' : 'Medium',
          evidence: [
            `CPA saat ini: ${formatRupiah(current.cpa)} (sebelumnya ${formatRupiah(previous.cpa)})`,
            `Target CPA: ${formatRupiah(targets.targetCpa)} | Break-Even CPA: ${formatRupiah(targets.breakEvenCpa)}`,
            `Kenaikan biaya: ${formatPercent(cpaChange, true)}`,
          ],
        };
      }
      return null;
    },
  },

  // 6. ROAS DROP RULE
  // Strictly requires current ROAS != null AND previous ROAS != null
  {
    id: 'ROAS_DROP',
    name: 'Penurunan ROAS Signifikan',
    evaluate: (ctx) => {
      const { current, previous, targets } = ctx;
      if (
        current.spend === null || 
        previous.spend === null || 
        current.spend < 100_000 || 
        previous.spend < 100_000 ||
        current.roas === null ||
        previous.roas === null
      ) {
        return null;
      }

      const roasChange = calculatePercentChange(current.roas, previous.roas);
      if (roasChange === null) return null;

      const isBelowTarget = current.roas < (targets.targetRoas || 3.0);

      if (roasChange <= -20 && isBelowTarget) {
        return {
          type: 'ROAS_DROP',
          title: 'ROAS Menurun Signifikan',
          description: `Efisiensi laba iklan turun ${formatPercent(Math.abs(roasChange))} dan berada di bawah target ROAS ${targets.targetRoas}x.`,
          severity: current.roas < 1.5 ? 'critical' : 'warning',
          confidence: 'Medium',
          evidence: [
            `ROAS saat ini: ${current.roas.toFixed(2)}x (periode lalu: ${previous.roas.toFixed(2)}x)`,
            `Target ROAS yang ditetapkan: ${(targets.targetRoas || 3.0).toFixed(2)}x`,
            `Perubahan: ${formatPercent(roasChange)}`,
          ],
        };
      }
      return null;
    },
  },

  // 7. CTR DROP (Standalone)
  // Strictly requires current.ctr != null AND previous.ctr != null
  {
    id: 'CTR_DROP',
    name: 'Penurunan CTR (Daya Tarik Klik)',
    evaluate: (ctx) => {
      const { current, previous } = ctx;
      if (
        current.impressions === null || 
        current.impressions < 800 ||
        current.ctr === null ||
        previous.ctr === null
      ) {
        return null;
      }

      const ctrChange = calculatePercentChange(current.ctr, previous.ctr);
      if (ctrChange === null) return null;

      if (ctrChange <= -25 && current.ctr < 1.5) {
        return {
          type: 'CTR_DROP',
          title: 'Daya Tarik Klik (CTR) Turun',
          description: 'Rasio klik iklan mengalami penurunan tajam, menunjukkan minat audiens terhadap materi iklan berkurang.',
          severity: 'warning',
          confidence: 'Medium',
          evidence: [
            `CTR saat ini: ${current.ctr}% (sebelumnya ${previous.ctr}%)`,
            `Penurunan: ${formatPercent(ctrChange)}`,
          ],
        };
      }
      return null;
    },
  },

  // 8. HIGH FREQUENCY
  // Strictly requires current.frequency != null
  {
    id: 'HIGH_FREQUENCY',
    name: 'Frekuensi Tayang Terlalu Tinggi',
    evaluate: (ctx) => {
      const { current } = ctx;
      if (
        current.frequency === null || 
        current.impressions === null ||
        current.frequency < 3.2 || 
        current.impressions < 1500
      ) {
        return null;
      }

      return {
        type: 'HIGH_FREQUENCY',
        title: 'Frekuensi Penayangan Tinggi',
        description: `Orang yang sama rata-rata sudah melihat iklan ini ${current.frequency.toFixed(1)} kali. Potensi saturasi audiens.`,
        severity: 'warning',
        confidence: 'High',
        evidence: [
          `Frequency: ${current.frequency.toFixed(2)} (Batas aman cold audience: 1.5 - 2.2)`,
          `Total Impresi: ${current.impressions.toLocaleString('id-ID')} untuk Reach ${formatEvidenceNumber(current.reach, 'orang')}`,
        ],
      };
    },
  },

  // 9. CREATIVE OUTPERFORMING (Winner)
  {
    id: 'CREATIVE_OUTPERFORMING',
    name: 'Creative Performa Unggul (Winner)',
    evaluate: (ctx) => {
      const { current, targets } = ctx;
      if (
        current.purchases === null || 
        current.purchases < 3 || 
        current.spend === null || 
        current.spend < targets.targetCpa * 1.5 ||
        current.roas === null ||
        current.cpa === null ||
        current.ctr === null
      ) {
        return null;
      }

      const isRoasGreat = current.roas >= (targets.targetRoas || 3.0) * 1.1;
      const isCpaLow = current.cpa <= targets.targetCpa * 0.9;
      const isCtrGood = current.ctr >= (targets.targetCtr || 1.8);

      if ((isRoasGreat || isCpaLow) && isCtrGood) {
        return {
          type: 'CREATIVE_OUTPERFORMING',
          title: 'Top Performing Creative',
          description: 'Materi iklan ini menghasilkan efisiensi di atas target bisnis Anda dengan CPA murah dan ROAS tinggi.',
          severity: 'info',
          confidence: 'High',
          evidence: [
            `ROAS: ${current.roas.toFixed(2)}x (Target: ${targets.targetRoas}x)`,
            `CPA: ${formatRupiah(current.cpa)} (Target: ${formatRupiah(targets.targetCpa)})`,
            `CTR: ${current.ctr}% dengan ${current.purchases} pesanan sukses`,
          ],
        };
      }
      return null;
    },
  },
];
