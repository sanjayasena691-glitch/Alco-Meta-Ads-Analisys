import { 
  StructuredAiAnalysis, 
  RuleEvaluation, 
  PerformanceMetrics, 
  BusinessTargets,
  ConfidenceLevel,
  LandingPageBehaviorMetrics,
  LandingPageEvaluation,
  FunnelDiagnosisResult
} from '../../types';
import { formatRupiah, formatPercent, formatNumber, formatRoas, formatFrequency } from '../../utils/formatters';

export interface AnalysisRequestPayload {
  entityId: string;
  entityName: string;
  entityType: 'account' | 'campaign' | 'adset' | 'ad' | 'landing_page' | 'funnel';
  metrics: PerformanceMetrics;
  previousMetrics: PerformanceMetrics;
  evaluation: RuleEvaluation;
  targets: BusinessTargets;
  userCustomQuestion?: string;
  landingPageMetrics?: LandingPageBehaviorMetrics;
  landingPageEvaluation?: LandingPageEvaluation;
  funnelEvaluation?: FunnelDiagnosisResult;
}

export async function requestAiDiagnosis(payload: AnalysisRequestPayload): Promise<StructuredAiAnalysis> {
  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.whatHappened) {
        return {
          ...data,
          source: 'gemini',
          generatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
      }
    }
  } catch (err) {
    console.warn('AI API fallback to local rule-backed diagnostic engine:', err);
  }

  // Graceful rule-backed diagnostic generation
  return generateDeterministicAnalysis(payload);
}

export function generateDeterministicAnalysis(payload: AnalysisRequestPayload): StructuredAiAnalysis {
  const { 
    entityName, 
    entityType, 
    metrics, 
    previousMetrics, 
    evaluation, 
    targets, 
    landingPageMetrics, 
    landingPageEvaluation, 
    funnelEvaluation 
  } = payload;

  // 1. If we have a Funnel Diagnosis Result with a distinct bottleneck, prioritize it!
  if (funnelEvaluation && funnelEvaluation.mainBottleneck !== 'UNKNOWN') {
    return {
      entityName,
      entityType,
      primaryBottleneck: funnelEvaluation.primaryBottleneck || funnelEvaluation.mainBottleneck,
      secondaryIssue: funnelEvaluation.secondaryIssue || null,
      whereTheProblemIs: funnelEvaluation.bottleneckTitle,
      whatHappened: funnelEvaluation.headlineSummary,
      why: funnelEvaluation.detailedReason,
      possibleCause: funnelEvaluation.detailedReason,
      evidence: funnelEvaluation.evidence,
      recommendedAction: funnelEvaluation.recommendedAction,
      dontDoYet: funnelEvaluation.dontDoYet,
      nextThingToMonitor: 'Pantau kestabilan konversi dan biaya per akuisisi (CPA) selama 24 jam ke depan.',
      confidence: funnelEvaluation.confidence,
      generatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      source: 'rule_engine',
    };
  }

  const hasKnownSpend = metrics.spend !== null && metrics.spend !== undefined && Number.isFinite(metrics.spend);
  const isInsufficient = evaluation.status === 'NOT_ENOUGH_DATA' || !hasKnownSpend || metrics.spend! < targets.targetCpa * 0.7;

  if (isInsufficient) {
    return {
      entityName,
      entityType,
      primaryBottleneck: 'INSUFFICIENT_DATA',
      secondaryIssue: null,
      whereTheProblemIs: 'Data Belum Cukup',
      whatHappened: hasKnownSpend
        ? `Iklan ${entityName} baru berjalan dengan spend ${formatRupiah(metrics.spend)} dan menghasilkan ${formatNumber(metrics.impressions)} impresi. Belum terkumpul cukup sinyal konversi dari Meta.`
        : `Data metrik performa untuk ${entityName} belum tersedia atau belum cukup untuk dianalisis.`,
      why: hasKnownSpend
        ? 'Iklan masih berada dalam fase kalibrasi awal (learning phase). Algoritma Meta sedang mengidentifikasi segmen audience yang paling responsif.'
        : 'Meta Graph API belum mengembalikan metrik spend/tayangan yang cukup pada periode yang dipilih.',
      possibleCause: hasKnownSpend
        ? 'Iklan masih berada dalam fase kalibrasi awal (learning phase). Algoritma Meta sedang mengidentifikasi segmen audience yang paling responsif.'
        : 'Campaign baru dibuat, belum memiliki delivery, atau event insight belum tersedia.',
      evidence: [
        `Spend terkumpul: ${formatRupiah(metrics.spend)} (Target CPA: ${formatRupiah(targets.targetCpa)})`,
        `Jumlah Pembelian: ${metrics.purchases !== null && metrics.purchases !== undefined ? `${metrics.purchases} purchase` : 'N/A'}`,
        `Total Impresi: ${formatNumber(metrics.impressions)} (standar evaluasi minimal 1.000+)`,
      ],
      recommendedAction: 'Data belum cukup untuk mengambil keputusan. Biarkan iklan berjalan selama minimal 24 - 48 jam ke depan tanpa intervensi.',
      dontDoYet: 'Hindari mengubah materi iklan, targeting, atau menaikkan/menurunkan budget terlalu cepat. Tindakan prematur akan mereset fase pembelajaran Meta.',
      nextThingToMonitor: 'Pantau spend hingga mencapai 1x Target CPA sebelum mengambil kesimpulan.',
      confidence: 'High' as ConfidenceLevel,
      generatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      source: 'rule_engine',
    };
  }

  const fatigueSignal = evaluation.signals.find((s) => s.type === 'CREATIVE_FATIGUE');
  if (fatigueSignal) {
    return {
      entityName,
      entityType,
      primaryBottleneck: 'CREATIVE',
      secondaryIssue: null,
      whereTheProblemIs: 'Creative Fatigue (Meta Ads)',
      whatHappened: `CTR pada ${entityName} turun dari ${formatPercent(previousMetrics.ctr, false, 2)} ke ${formatPercent(metrics.ctr, false, 2)} dalam periode pengamatan, sementara Frequency naik ke ${formatFrequency(metrics.frequency)}.`,
      why: 'Data menunjukkan kemungkinan kuat Creative Fatigue (kelelahan materi iklan). Sebagian besar target audiens sudah melihat visual yang sama berulang kali.',
      possibleCause: 'Data menunjukkan kemungkinan kuat Creative Fatigue (kelelahan materi iklan). Sebagian besar target audiens sudah melihat visual yang sama berulang kali.',
      evidence: [
        `CTR turun signifikan: ${formatPercent(previousMetrics.ctr, false, 2)} → ${formatPercent(metrics.ctr, false, 2)}`,
        `Frequency meningkat: ${formatFrequency(previousMetrics.frequency)} → ${formatFrequency(metrics.frequency)}`,
        `CPC melonjak: ${formatRupiah(previousMetrics.cpc)} → ${formatRupiah(metrics.cpc)}`,
      ],
      recommendedAction: 'Siapkan 2 - 3 creative baru dengan hook (3 detik pertama) dan sudut pandang (angle) berbeda, lalu masukkan ke ad set ini tanpa mengubah audience.',
      dontDoYet: 'Jangan langsung mengubah targeting audience dan mematikan ad set sekaligus, karena campaign utama masih memiliki momentum lelang.',
      nextThingToMonitor: 'Pantau apakah materi iklan baru berhasil mengembalikan CTR di atas 1.5%.',
      confidence: fatigueSignal.confidence,
      generatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      source: 'rule_engine',
    };
  }

  const highSpendSignal = evaluation.signals.find((s) => s.type === 'HIGH_SPEND_NO_PURCHASE');
  if (highSpendSignal) {
    return {
      entityName,
      entityType,
      primaryBottleneck: 'LANDING_PAGE_CONTENT',
      secondaryIssue: null,
      whereTheProblemIs: 'Landing Page & Alur Konversi',
      whatHappened: `Iklan ${entityName} telah menghabiskan budget ${formatRupiah(metrics.spend)} dengan ${formatNumber(metrics.clicks)} klik ke landing page, namun belum menghasilkan 1 pun pembelian.`,
      why: 'Ada kemungkinan kendala pada kesesuaian penawaran (offer mismatch), loading website yang lambat di smartphone, atau friction pada proses checkout.',
      possibleCause: 'Ada kemungkinan kendala pada kesesuaian penawaran (offer mismatch), loading website yang lambat di smartphone, atau friction pada proses checkout.',
      evidence: [
        `Total Spend: ${formatRupiah(metrics.spend)} (Melebihi Break-even CPA ${formatRupiah(targets.breakEvenCpa)})`,
        `Penjualan: 0 purchase`,
        `CTR saat ini: ${formatPercent(metrics.ctr, false, 2)}, menandakan traffic datang namun gagal konversi di website.`,
      ],
      recommendedAction: 'Lakukan audit mandiri pada landing page: uji waktu loading, cek apakah harga dan copywriting selaras dengan iklan, dan tes alur checkout di HP.',
      dontDoYet: 'Jangan menaikkan budget harian untuk "memaksa" konversi sebelum conversion funnel landing page dipastikan sehat.',
      nextThingToMonitor: 'Pantau Quick Back rate dan Scroll depth di Microsoft Clarity.',
      confidence: 'High' as ConfidenceLevel,
      generatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      source: 'rule_engine',
    };
  }

  // Healthy or General Performance
  return {
    entityName,
    entityType,
    primaryBottleneck: 'HEALTHY',
    secondaryIssue: null,
    whereTheProblemIs: 'Kinerja Stabil',
    whatHappened: `Campaign ${entityName} beroperasi dalam kondisi stabil dengan ROAS ${formatRoas(metrics.roas)} dan CPA ${formatRupiah(metrics.cpa)}.`,
    why: 'Kombinasi materi promosi, pesan penawaran, dan target audiens selaras dengan target bisnis Anda.',
    possibleCause: 'Kombinasi materi promosi, pesan penawaran, dan target audiens selaras dengan target bisnis Anda.',
    evidence: [
      `ROAS saat ini: ${formatRoas(metrics.roas)} (Target: ${targets.targetRoas}x)`,
      `CPA: ${formatRupiah(metrics.cpa)} (Target CPA: ${formatRupiah(targets.targetCpa)})`,
      `Total Pembelian: ${metrics.purchases !== null && metrics.purchases !== undefined ? `${metrics.purchases} pesanan terverifikasi` : 'N/A'}`,
    ],
    recommendedAction: 'Pertahankan campaign. Bila ingin menaikkan omzet, lakukan scale-up bertahap maksimal 15 - 20% setiap 3 hari agar learning phase tetap stabil.',
    dontDoYet: 'Jangan melipatgandakan budget lebih dari 50% sekaligus karena bisa merusak kestabilan delivery lelang Meta.',
    nextThingToMonitor: 'Pantau kenaikan frequency agar tidak terjadi kejenuhan audiens saat scaling.',
    confidence: 'High' as ConfidenceLevel,
    generatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    source: 'rule_engine',
  };
}

