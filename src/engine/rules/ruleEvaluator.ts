import { 
  DetectedSignal, 
  RuleEvaluation, 
  EntityStatus, 
  PerformanceMetrics, 
  BusinessTargets, 
  ConfidenceLevel 
} from '../../types';
import { RULES, RuleContext, formatEvidenceSpend, formatEvidenceCpa, formatEvidenceRoas, formatEvidenceCtr, formatEvidenceFrequency } from './ruleDefinitions';
import { formatRupiah, formatRoas } from '../../utils/formatters';

export function evaluateEntity(
  entityId: string,
  entityName: string,
  entityType: 'account' | 'campaign' | 'adset' | 'ad',
  current: PerformanceMetrics,
  previous: PerformanceMetrics,
  targets: BusinessTargets
): RuleEvaluation {
  const ctx: RuleContext = {
    entityName,
    entityType,
    current,
    previous,
    targets,
  };

  const detectedSignals: DetectedSignal[] = [];

  for (const rule of RULES) {
    const signal = rule.evaluate(ctx);
    if (signal) {
      detectedSignals.push(signal);
    }
  }

  // Determine overall status
  let status: EntityStatus = 'HEALTHY';
  let primaryIssue: string | undefined;
  let recommendedAction: string | undefined;
  let dontDoYet: string | undefined;
  let confidence: ConfidenceLevel = 'High';

  // 1. Check for Insufficient Data first
  const insufficientSignal = detectedSignals.find((s) => s.type === 'INSUFFICIENT_DATA');
  if (insufficientSignal) {
    status = 'NOT_ENOUGH_DATA';
    primaryIssue = 'Data belum mencukupi untuk mengambil kesimpulan operasional.';
    recommendedAction = 'Biarkan iklan berjalan 24 - 48 jam lagi hingga mencapai minimal 800+ tayangan atau mendekati batas 1x Target CPA sebelum dievaluasi.';
    dontDoYet = 'Hindari mengubah campaign, mengganti audience, atau mematikan iklan terlalu cepat karena sistem Meta masih dalam tahap learning phase.';
    confidence = 'High';
    return {
      entityId,
      entityName,
      entityType,
      status,
      signals: detectedSignals,
      primaryIssue,
      recommendedAction,
      dontDoYet,
      confidence,
    };
  }

  // 2. Check for Critical Problems
  const criticalSignals = detectedSignals.filter((s) => s.severity === 'critical');
  const warningSignals = detectedSignals.filter((s) => s.severity === 'warning');

  if (criticalSignals.length > 0) {
    status = 'PROBLEM';
    const topCritical = criticalSignals[0];
    primaryIssue = topCritical.title;
    confidence = topCritical.confidence;

    if (topCritical.type === 'CREATIVE_FATIGUE') {
      recommendedAction = 'Siapkan 2 - 3 materi visual/video baru dengan 3 detik pertama (hook) yang berbeda, lalu uji coba pada ad set yang sama tanpa mengganggu campaign utama.';
      dontDoYet = 'Jangan langsung mengubah targeting audience dan copy sekaligus, karena Anda tidak akan tahu elemen mana yang sebenarnya memperbaiki atau memperburuk performa.';
    } else if (topCritical.type === 'HIGH_SPEND_NO_PURCHASE') {
      recommendedAction = 'Periksa kesesuaian antara janji iklan dengan headline landing page (message match), cek kecepatan loading website di smartphone, dan uji tombol checkout.';
      dontDoYet = 'Jangan menaikkan budget harian dengan harapan algoritma akan mencari pembeli sendiri jika di angka spend ini belum ada respon sama sekali.';
    } else if (topCritical.type === 'CPA_SPIKE') {
      recommendedAction = 'Bandingkan performa tiap creative di dalam ad set ini. Identifikasi creative yang menyedot budget terbesar namun menghasilkan CPA termahal.';
      dontDoYet = 'Jangan langsung mematikan seluruh campaign jika hanya 1 ad set atau 1 creative tertentu yang menyebabkan kenaikan biaya rata-rata.';
    } else if (topCritical.type === 'ROAS_DROP') {
      recommendedAction = 'Evaluasi rata-rata nilai order (AOV) dan cek apakah penawaran diskon atau bundling produk dapat meningkatkan total revenue per pembeli.';
      dontDoYet = 'Jangan menurunkan harga produk secara drastis tanpa menghitung margin laba bersih.';
    }
  } else if (warningSignals.length > 0) {
    status = 'MONITOR';
    const topWarning = warningSignals[0];
    primaryIssue = topWarning.title;
    confidence = topWarning.confidence;
    if (topWarning.type === 'CAMPAIGN_NOT_SPENDING') {
      recommendedAction = 'Periksa status aktifasi kampanye di Ads Manager, saldo pembayaran, dan pastikan target audiens tidak terlalu sempit (under-delivery).';
      dontDoYet = 'Jangan menghapus campaign jika statusnya baru saja dipublikasikan.';
    } else {
      recommendedAction = 'Amati performa selama 24 jam ke depan. Bila tren penurunan berlanjut, persiapkan rotasi materi promosi atau perluas sedikit parameter audience.';
      dontDoYet = 'Belum perlu melakukan perubahan besar sekarang. Biarkan fluktuasi lelang harian stabil terlebih dahulu.';
    }
  } else {
    status = 'HEALTHY';
    primaryIssue = 'Performa stabil dan memenuhi target bisnis yang ditentukan.';
    recommendedAction = 'Pertahankan setup saat ini. Jika ingin meningkatkan omzet, naikkan budget secara bertahap maksimal 15 - 20% setiap 3 - 4 hari.';
    dontDoYet = 'Jangan menggandakan budget secara mendadak (scaling agresif 100%+) karena dapat mereset fase pembelajaran (learning phase) algoritma Meta.';
    confidence = 'High';
  }

  return {
    entityId,
    entityName,
    entityType,
    status,
    signals: detectedSignals,
    primaryIssue,
    recommendedAction,
    dontDoYet,
    confidence,
  };
}

export function evaluateEntityHealth(
  current: PerformanceMetrics,
  previous: PerformanceMetrics,
  targets: BusinessTargets,
  id: string = 'account_overview',
  name: string = 'Account Health',
  type: 'account' | 'campaign' | 'adset' | 'ad' = 'account'
): RuleEvaluation {
  return evaluateEntity(id, name, type, current, previous, targets);
}

import { Campaign, RecommendationCardItem, AnomalyAlert } from '../../types';
import { LandingPageWithMetrics } from '../../services/clarity/clarityTypes';
import { evaluateLandingPageHealth } from './landingPage/landingPageRuleEvaluator';
import { FunnelDiagnosisResult } from '../../types';

export function generateRecommendationsFromCampaigns(
  campaigns: Campaign[],
  targets: BusinessTargets,
  landingPages?: LandingPageWithMetrics[],
  funnelDiagnosis?: FunnelDiagnosisResult
): RecommendationCardItem[] {
  const recommendations: RecommendationCardItem[] = [];

  // 1. Funnel-Level Bottleneck Recommendation (Highest Priority if critical)
  if (funnelDiagnosis && funnelDiagnosis.mainBottleneck !== 'HEALTHY' && funnelDiagnosis.mainBottleneck !== 'UNKNOWN') {
    const isCritical = funnelDiagnosis.mainBottleneck === 'LANDING_PAGE_TECHNICAL' || funnelDiagnosis.mainBottleneck === 'LANDING_PAGE_CONTENT' || funnelDiagnosis.mainBottleneck === 'CHECKOUT';
    recommendations.push({
      id: 'rec_funnel_bottleneck',
      entityId: 'funnel_root',
      entityName: 'Funnel Konversi Keseluruhan',
      entityType: 'Funnel',
      priority: isCritical ? 'HIGH_PRIORITY' : 'MONITOR',
      confidence: funnelDiagnosis.confidence,
      status: isCritical ? 'PROBLEM' : 'MONITOR',
      problem: `Bottleneck Utama: ${funnelDiagnosis.bottleneckTitle}`,
      evidence: funnelDiagnosis.evidence,
      recommendedAction: funnelDiagnosis.recommendedAction,
      dontDoYet: funnelDiagnosis.dontDoYet,
      potentialImpact: `Menghilangkan kebocoran drop-off terbesar di tahap "${funnelDiagnosis.metrics.biggestDropoffStage}" (${funnelDiagnosis.metrics.dropoffPercentage}% drop).`,
    });
  }

  // 2. Landing Page Recommendations
  if (landingPages && landingPages.length > 0) {
    landingPages.forEach((lp) => {
      const lpEval = evaluateLandingPageHealth(lp.metrics, lp.profile.name);
      if (lpEval.status === 'PROBLEM') {
        recommendations.push({
          id: `rec_${lp.profile.id}`,
          entityId: lp.profile.id,
          entityName: lp.profile.name,
          entityType: 'Landing Page',
          priority: 'HIGH_PRIORITY',
          confidence: lpEval.confidence,
          status: 'PROBLEM',
          problem: lpEval.primaryIssue || 'Terdeteksi kendala pengalaman pengunjung di landing page',
          evidence: lpEval.signals[0]?.evidence || [`Skor Kesehatan: ${lpEval.healthScore}/100`],
          recommendedAction: lpEval.recommendedAction || 'Audit teknis dan perbaiki alur navigasi.',
          dontDoYet: lpEval.dontDoYet,
          potentialImpact: 'Menaikkan rasio konversi halaman (LP View Rate / CTA Rate) dan menyelamatkan budget iklan Meta.',
        });
      } else if (lpEval.status === 'MONITOR') {
        recommendations.push({
          id: `rec_${lp.profile.id}`,
          entityId: lp.profile.id,
          entityName: lp.profile.name,
          entityType: 'Landing Page',
          priority: 'MONITOR',
          confidence: lpEval.confidence,
          status: 'MONITOR',
          problem: lpEval.primaryIssue || 'Perlu pemantauan interaksi tombol & scroll',
          evidence: lpEval.signals[0]?.evidence || [`Skor Kesehatan: ${lpEval.healthScore}/100`],
          recommendedAction: lpEval.recommendedAction || 'Pantau rekaman sesi di Clarity.',
          dontDoYet: lpEval.dontDoYet,
          potentialImpact: 'Mengidentifikasi titik frustrasi minor sebelum menjadi masalah fatal.',
        });
      }
    });
  }

  // 3. Campaign & Creative level recommendations
  campaigns.forEach((c) => {
    const campEval = evaluateEntity(c.id, c.name, 'campaign', c.metrics, c.previousMetrics, targets);
    
    if (campEval.status === 'PROBLEM') {
      recommendations.push({
        id: `rec_${c.id}`,
        entityId: c.id,
        entityName: c.name,
        entityType: 'Campaign',
        priority: 'HIGH_PRIORITY',
        confidence: campEval.confidence,
        status: campEval.status,
        problem: campEval.primaryIssue || 'Terdeteksi anomali kinerja biaya yang perlu ditangani',
        evidence: campEval.signals[0]?.evidence || [`CPA: ${formatEvidenceCpa(c.metrics.cpa)}`],
        recommendedAction: campEval.recommendedAction || 'Pantau performa kampanye',
        dontDoYet: campEval.dontDoYet,
        potentialImpact: 'Menghemat budget terbuang dan menstabilkan biaya konversi.',
      });
    } else if (campEval.status === 'MONITOR') {
      recommendations.push({
        id: `rec_${c.id}`,
        entityId: c.id,
        entityName: c.name,
        entityType: 'Campaign',
        priority: 'MONITOR',
        confidence: campEval.confidence,
        status: campEval.status,
        problem: campEval.primaryIssue || 'Fluktuasi metrik dalam rentang wajar',
        evidence: campEval.signals[0]?.evidence || [`CTR: ${formatEvidenceCtr(c.metrics.ctr)}`],
        recommendedAction: campEval.recommendedAction || 'Pantau metrik selama 24 jam ke depan',
        dontDoYet: campEval.dontDoYet,
        potentialImpact: 'Mencegah intervensi prematur selama fase pembelajaran.',
      });
    } else if (campEval.status === 'HEALTHY') {
      recommendations.push({
        id: `rec_${c.id}`,
        entityId: c.id,
        entityName: c.name,
        entityType: 'Campaign',
        priority: 'MAINTAIN',
        confidence: campEval.confidence,
        status: campEval.status,
        problem: 'Performa konsisten di atas target bisnis.',
        evidence: [`ROAS: ${formatEvidenceRoas(c.metrics.roas)}`, `CPA: ${formatEvidenceCpa(c.metrics.cpa)}`],
        recommendedAction: campEval.recommendedAction || 'Pertahankan materi dan skala budget bertahap 15-20%.',
        dontDoYet: campEval.dontDoYet,
        potentialImpact: 'Mempertahankan profitabilitas dan kestabilan volume penjualan.',
      });
    }

    // Creative level recommendations
    c.adSets.forEach((as) => {
      as.ads.forEach((ad) => {
        const adEval = evaluateEntity(ad.id, ad.name, 'ad', ad.metrics, ad.previousMetrics, targets);
        const fatigueSignal = adEval.signals.find((s) => s.type === 'CREATIVE_FATIGUE');
        if (fatigueSignal) {
          recommendations.push({
            id: `rec_ad_${ad.id}`,
            entityId: ad.id,
            entityName: ad.name,
            entityType: 'Creative',
            priority: 'HIGH_PRIORITY',
            confidence: fatigueSignal.confidence,
            status: 'PROBLEM',
            problem: `Creative Fatigue terdeteksi (CTR turun drastis, Frequency melonjak ke ${formatEvidenceFrequency(ad.metrics.frequency)})`,
            evidence: fatigueSignal.evidence,
            recommendedAction: adEval.recommendedAction || 'Siapkan 2 - 3 creative baru dengan hook berbeda untuk menggantikan materi ini.',
            dontDoYet: adEval.dontDoYet,
            potentialImpact: 'Mengembalikan respon audiens dan menurunkan biaya per klik (CPC).',
          });
        }
      });
    });
  });

  return recommendations;
}

export function generateAlertsFromCampaigns(
  campaigns: Campaign[],
  targets: BusinessTargets,
  landingPages?: LandingPageWithMetrics[]
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];

  // Landing Page Alerts
  if (landingPages) {
    landingPages.forEach((lp) => {
      const lpEval = evaluateLandingPageHealth(lp.metrics, lp.profile.name);
      lpEval.signals.forEach((sig, idx) => {
        if (sig.severity === 'critical' || sig.severity === 'warning') {
          alerts.push({
            id: `alert_lp_${lp.profile.id}_${idx}`,
            entityName: lp.profile.name,
            entityType: 'Landing Page',
            title: sig.title,
            metricLabel: sig.evidence[0] || 'Perilaku Pengunjung',
            changeDescription: sig.evidence[1] || sig.description,
            severity: sig.severity === 'critical' ? 'CRITICAL' : 'WARNING',
            timestamp: 'Baru saja',
            ruleSignal: sig.type,
            possibleCause: sig.description,
            recommendedAction: lpEval.recommendedAction || 'Audit halaman di Microsoft Clarity.',
          });
        }
      });
    });
  }

  campaigns.forEach((c) => {
    const evalResult = evaluateEntity(c.id, c.name, 'campaign', c.metrics, c.previousMetrics, targets);
    evalResult.signals.forEach((sig, idx) => {
      if (sig.severity === 'critical' || sig.severity === 'warning') {
        alerts.push({
          id: `alert_${c.id}_${idx}`,
          entityName: c.name,
          entityType: 'Campaign',
          title: sig.title,
          metricLabel: sig.evidence[0] || 'Biaya Iklan',
          changeDescription: sig.evidence[1] || sig.description,
          severity: sig.severity === 'critical' ? 'CRITICAL' : 'WARNING',
          timestamp: 'Baru saja',
          ruleSignal: sig.type,
          possibleCause: sig.description,
          recommendedAction: evalResult.recommendedAction || 'Pantau performa kampanye.',
        });
      }
    });

    c.adSets.forEach((as) => {
      as.ads.forEach((ad) => {
        const adEval = evaluateEntity(ad.id, ad.name, 'ad', ad.metrics, ad.previousMetrics, targets);
        adEval.signals.forEach((sig, sIdx) => {
          if (sig.severity === 'critical' || sig.severity === 'warning') {
            alerts.push({
              id: `alert_ad_${ad.id}_${sIdx}`,
              entityName: ad.name,
              entityType: 'Creative',
              title: sig.title,
              metricLabel: sig.evidence[0] || 'CTR & Frequency',
              changeDescription: sig.evidence[1] || sig.description,
              severity: sig.severity === 'critical' ? 'CRITICAL' : 'WARNING',
              timestamp: 'Hari ini',
              ruleSignal: sig.type,
              possibleCause: sig.description,
              recommendedAction: adEval.recommendedAction || 'Siapkan creative baru untuk rotasi materi.',
            });
          }
        });
      });
    });
  });

  return alerts;
}
