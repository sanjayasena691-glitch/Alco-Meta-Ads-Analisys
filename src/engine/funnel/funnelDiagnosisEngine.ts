import { 
  PerformanceMetrics, 
  BusinessTargets, 
  LandingPageBehaviorMetrics, 
  LandingPageEvaluation, 
  FunnelDiagnosisResult, 
  FunnelBottleneck, 
  FunnelStageStatus, 
  FunnelStageMetrics, 
  FunnelStageItem,
  FunnelDataCoverage,
  ConfidenceLevel,
  RecommendationPriority
} from '../../types';
import { 
  calculateLpViewRate, 
  calculateEngagementRate,
  calculateCtaClickRate,
  calculateCheckoutRate, 
  calculatePurchaseRate,
  calculateSafeRate,
  calculatePercentChange
} from '../calculations/metrics';
import { evaluateLandingPageHealth } from '../rules/landingPage/landingPageRuleEvaluator';

export interface BottleneckDetectionResult {
  primaryBottleneck: FunnelBottleneck;
  secondaryIssue: string | null;
  confidence: ConfidenceLevel;
  bottleneckTitle: string;
  headlineSummary: string;
  detailedReason: string;
  evidence: string[];
  recommendedAction: string;
  dontDoYet: string;
  priority: RecommendationPriority;
}

/**
 * Dedicated Deterministic Bottleneck Detection Algorithm
 * Incorporates multi-signal reasoning, business target awareness (Target CPA vs Break-even),
 * trend awareness (current vs previous), message-match detection, and conflict resolution.
 */
export function detectPrimaryBottleneck(
  metaMetrics: PerformanceMetrics,
  targets: BusinessTargets,
  lpMetrics?: LandingPageBehaviorMetrics,
  lpEvaluation?: LandingPageEvaluation,
  previousMetrics?: PerformanceMetrics
): BottleneckDetectionResult {
  const impressions = metaMetrics.impressions;
  const linkClicks = metaMetrics.linkClicks ?? metaMetrics.clicks;
  const spend = metaMetrics.spend;
  const purchases = metaMetrics.purchases;
  const ctr = metaMetrics.ctr;
  const cpc = metaMetrics.cpc;
  const cpa = metaMetrics.cpa;
  const roas = metaMetrics.roas;
  const frequency = metaMetrics.frequency;

  const sessions = lpMetrics?.sessions;
  const landingPageViews = metaMetrics.landingPageViews ?? (sessions !== undefined ? sessions : null);
  const checkoutStarts = metaMetrics.initiateCheckout ?? lpMetrics?.checkoutStarts ?? null;
  const ctaClicks = lpMetrics?.ctaClicks ?? null;

  // Relative Trends (if previous period exists)
  const ctrTrend = previousMetrics && previousMetrics.ctr > 0 
    ? calculatePercentChange(ctr, previousMetrics.ctr) 
    : null;
  const cpcTrend = previousMetrics && previousMetrics.cpc > 0 
    ? calculatePercentChange(cpc, previousMetrics.cpc) 
    : null;
  const freqTrend = previousMetrics && previousMetrics.frequency > 0 
    ? calculatePercentChange(frequency, previousMetrics.frequency) 
    : null;
  const cpaTrend = previousMetrics && previousMetrics.cpa > 0 
    ? calculatePercentChange(cpa, previousMetrics.cpa) 
    : null;

  // Rate helpers (pure numbers or null)
  const lpViewRate = calculateLpViewRate(landingPageViews, linkClicks);
  const quickBackRate = lpMetrics ? calculateSafeRate(lpMetrics.quickBacks, lpMetrics.sessions) : null;
  const rageClickRate = lpMetrics ? calculateSafeRate(lpMetrics.rageClicks, lpMetrics.sessions) : null;
  const deadClickRate = lpMetrics ? calculateSafeRate(lpMetrics.deadClicks, lpMetrics.sessions) : null;
  const ctaClickRateVal = calculateCtaClickRate(ctaClicks, sessions);
  const checkoutRate = calculateCheckoutRate(checkoutStarts, sessions);
  const purchaseRate = calculatePurchaseRate(purchases, checkoutStarts);

  // Business Target Profitability Classification
  let cpaEvaluationText = '';
  if (purchases > 0) {
    if (cpa <= targets.targetCpa) {
      cpaEvaluationText = `CPA (Rp${cpa.toLocaleString('id-ID')}) berada dalam batas target (<= Rp${targets.targetCpa.toLocaleString('id-ID')}).`;
    } else if (cpa <= targets.breakEvenCpa) {
      cpaEvaluationText = `CPA (Rp${cpa.toLocaleString('id-ID')}) di atas target CPA (Rp${targets.targetCpa.toLocaleString('id-ID')}) namun masih di bawah batas break-even (Rp${targets.breakEvenCpa.toLocaleString('id-ID')}) — transaksi masih menghasilkan profit kotor.`;
    } else {
      cpaEvaluationText = `CPA (Rp${cpa.toLocaleString('id-ID')}) telah melebihi break-even CPA (Rp${targets.breakEvenCpa.toLocaleString('id-ID')}) — unit ekonomi mengalami kerugian operasional per transaksi.`;
    }
  }

  const evidence: string[] = [];

  // =========================================================================
  // RULE 1: INSUFFICIENT DATA PROTECTION
  // =========================================================================
  const isLowSpendNoPurchase = spend < targets.targetCpa * 0.7 && purchases === 0;
  const isSmallSample = impressions < 800 || linkClicks < 25 || (sessions !== undefined && sessions < 30);

  if (isLowSpendNoPurchase || (purchases === 0 && isSmallSample)) {
    evidence.push(`Total spend saat ini: Rp${spend.toLocaleString('id-ID')} (Ambang batas 0.7x Target CPA: Rp${Math.round(targets.targetCpa * 0.7).toLocaleString('id-ID')})`);
    evidence.push(`Tayangan: ${impressions.toLocaleString('id-ID')} (Standar minimal uji: 800)`);
    evidence.push(`Link clicks: ${linkClicks} | Sesi LP: ${sessions !== undefined ? sessions : 'N/A'}`);
    if (purchases === 0) evidence.push('Belum ada transaksi purchase yang tercatat.');

    return {
      primaryBottleneck: 'INSUFFICIENT_DATA',
      secondaryIssue: null,
      confidence: 'High',
      bottleneckTitle: 'Data Belum Cukup untuk Kesimpulan Statistik',
      headlineSummary: `Spend saat ini (Rp${spend.toLocaleString('id-ID')}) dan volume interaksi belum memenuhi batas minimum signifikansi statistik.`,
      detailedReason: 'Algoritma lelang Meta Ads masih dalam fase pembelajaran (learning phase), dan sample visitor belum cukup besar untuk menarik kesimpulan mengenai performa iklan ataupun landing page.',
      evidence,
      recommendedAction: 'Biarkan campaign mengumpulkan data statistik minimal mencapai 1x Target CPA atau minimal 50+ sesi landing page.',
      dontDoYet: 'Jangan pause campaign atau mengubah isi landing page berdasarkan data yang belum reliabel saat ini.',
      priority: 'MONITOR',
    };
  }

  // Track potential candidates for primary and secondary issues
  type IssueCandidate = {
    bottleneck: FunnelBottleneck;
    title: string;
    severityScore: number;
    description: string;
    signals: string[];
    action: string;
    dontDo: string;
    priority: RecommendationPriority;
    strongSignal: boolean;
  };

  const detectedIssues: IssueCandidate[] = [];

  // =========================================================================
  // CANDIDATE A: TECHNICAL LP PROBLEM (Loading crash / Script errors / High Rage Clicks)
  // =========================================================================
  const isScriptCrash = lpMetrics && lpMetrics.scriptErrors >= 8;
  const isLpViewLeak = linkClicks >= 25 && lpViewRate !== null && lpViewRate < 72.0 && (metaMetrics.landingPageViews !== undefined || sessions !== undefined);
  const isHighRage = rageClickRate !== null && rageClickRate >= 7.0 && (lpMetrics?.rageClicks || 0) >= 5;

  if (isScriptCrash || isLpViewLeak || isHighRage) {
    const techSignals: string[] = [];
    let severity = 85;
    let isVeryStrong = false;

    if (isLpViewLeak) {
      techSignals.push(`LP View Rate hanya ${lpViewRate}% dari ${linkClicks} klik iklan (kebocoran loading: ${(100 - (lpViewRate ?? 0)).toFixed(1)}%)`);
      severity += 10;
      if (lpViewRate < 60) isVeryStrong = true;
    }
    if (isScriptCrash) {
      techSignals.push(`Terdeteksi ${lpMetrics?.scriptErrors} JavaScript runtime errors di browser pengunjung`);
      severity += 15;
      isVeryStrong = true;
    }
    if (isHighRage) {
      techSignals.push(`Rage click tinggi: ${rageClickRate}% (${lpMetrics?.rageClicks} klik frustrasi pengunjung)`);
      severity += 10;
    }

    detectedIssues.push({
      bottleneck: 'LANDING_PAGE_TECHNICAL',
      title: 'Kendala Teknis & Kecepatan Memuat Landing Page',
      severityScore: severity,
      description: 'Pengunjung yang tertarik mengklik iklan terhalang oleh loading halaman yang lambat atau error script JavaScript di mobile browser.',
      signals: techSignals,
      action: 'Lakukan audit mobile speed (PageSpeed/Lighthouse) dan periksa error JavaScript pada browser mobile untuk memastikan seluruh skrip checkout berfungsi.',
      dontDo: 'Jangan menyalahkan materi iklan Meta Ads! Iklan sudah terbukti berhasil mengundang klik audiens.',
      priority: 'CRITICAL',
      strongSignal: isVeryStrong,
    });
  }

  // =========================================================================
  // CANDIDATE B: CREATIVE FATIGUE (Multi-signal: Frequency up + CTR down + CPC up + previous worse)
  // Must NOT trigger if CTR and CPC remain healthy despite high frequency (Scenario H)
  // =========================================================================
  const isHighFreq = frequency >= 2.4 || (freqTrend !== null && freqTrend >= 20);
  const isCtrDropping = (ctrTrend !== null && ctrTrend <= -15) || ctr < (targets.targetCtr ? targets.targetCtr * 0.75 : 1.25);
  const isCpcRising = (cpcTrend !== null && cpcTrend >= 15) || cpc > (targets.targetCpc ? targets.targetCpc * 1.3 : 4000);
  const isPerformanceDropping = roas < (targets.targetRoas || 2.5) || cpa > targets.targetCpa;

  if (isHighFreq && isCtrDropping && isCpcRising && isPerformanceDropping) {
    const creativeSignals: string[] = [
      `Frequency tinggi di angka ${frequency.toFixed(2)}x ${freqTrend ? `(naik +${freqTrend.toFixed(1)}%)` : ''}`,
      `CTR turun ke ${ctr}% ${ctrTrend ? `(${ctrTrend.toFixed(1)}% vs periode lalu)` : ''}`,
      `Biaya per klik (CPC) membengkak menjadi Rp${cpc.toLocaleString('id-ID')} ${cpcTrend ? `(+${cpcTrend.toFixed(1)}%)` : ''}`,
    ];

    detectedIssues.push({
      bottleneck: 'CREATIVE',
      title: 'Kelelahan Materi Kreatif (Creative Fatigue)',
      severityScore: 80,
      description: 'Kombinasi frekuensi penayangan tinggi, penurunan rasio klik (CTR), dan kenaikan biaya per klik (CPC) menunjukkan audiens target telah jenuh melihat materi iklan ini.',
      signals: creativeSignals,
      action: 'Unggah 2 - 3 variasi materi kreatif baru dengan visual hook berbeda (rotasi format video UGC / Carousel) untuk menyegarkan audiens.',
      dontDo: 'Jangan menaikkan budget harian pada materi yang sedang mengalami fatigue.',
      priority: cpa > targets.breakEvenCpa ? 'CRITICAL' : 'HIGH',
      strongSignal: (freqTrend !== null && freqTrend >= 30) || frequency >= 2.8,
    });
  }

  // =========================================================================
  // CANDIDATE C: LP CONTENT & MESSAGE MISMATCH
  // Requires actual lpMetrics to prevent hallucinating LP issues (Scenario J)
  // =========================================================================
  if (lpMetrics && (sessions || 0) >= 25) {
    const isGoodTraffic = (ctr >= 1.2 || linkClicks >= 30) && (lpViewRate === null || lpViewRate >= 68.0);
    const isQuickBackHigh = quickBackRate !== null && quickBackRate >= 28.0;
    const isScrollLow = lpMetrics.avgScrollDepth < 40;
    const isCtaLow = ctaClickRateVal !== null && ctaClickRateVal < 3.5 && (sessions || 0) >= 30;

    if (isGoodTraffic && (isQuickBackHigh || (isScrollLow && (lpMetrics.avgEngagementTime || 0) < 22))) {
      const contentSignals: string[] = [];
      if (quickBackRate !== null) contentSignals.push(`Quick Back Rate tinggi: ${quickBackRate}% pengunjung langsung keluar dalam < 5 detik`);
      if (lpMetrics.avgScrollDepth) contentSignals.push(`Rata-rata Scroll Depth rendah: ${lpMetrics.avgScrollDepth}% (banyak pengunjung tidak membaca penawaran)`);
      if (lpMetrics.avgEngagementTime) contentSignals.push(`Waktu keterlibatan rendah: ${lpMetrics.avgEngagementTime} detik`);
      if (isCtaLow) contentSignals.push(`Tingkat klik CTA rendah: ${ctaClickRateVal}% dari sesi`);

      detectedIssues.push({
        bottleneck: 'LANDING_PAGE_CONTENT',
        title: 'Ketidaksesuaian Pesan Landing Page (Message Mismatch)',
        severityScore: 78,
        description: 'Possible message mismatch antara janji iklan (ad promise/hook) dan headline/isi landing page. Audiens yang tertarik mengklik merasa konten di halaman tidak langsung relevan dengan apa yang mereka lihat di iklan.',
        signals: contentSignals,
        action: 'Selaraskan headline utama (H1) dan visual di bagian atas landing page (above-the-fold) agar tepat mencerminkan hook awal video iklan Meta. Geser ringkasan penawaran lebih ke atas.',
        dontDo: 'Jangan langsung merombak seluruh targeting Meta Ads atau menyalahkan creative, karena minat awal audiens terhadap iklan sudah terbukti bagus.',
        priority: 'HIGH',
        strongSignal: (quickBackRate !== null && quickBackRate >= 35.0) && isScrollLow,
      });
    }
  }

  // =========================================================================
  // CANDIDATE D: CHECKOUT FRICTION
  // =========================================================================
  const hasCheckoutActivity = (checkoutStarts || 0) >= 5;
  const isPoorPurchaseConversion = purchaseRate !== null && purchaseRate < 25.0;

  if (hasCheckoutActivity && isPoorPurchaseConversion && (lpViewRate === null || lpViewRate >= 65)) {
    const checkoutSignals: string[] = [
      `Sebanyak ${checkoutStarts} checkout diinisiasi, namun hanya ${purchases} yang selesai membayar`,
      `Tingkat penyelesaian checkout (Purchase Rate): ${purchaseRate}% (standar optimal e-commerce: 35%+ - 50%)`,
    ];

    detectedIssues.push({
      bottleneck: 'CHECKOUT',
      title: 'Hambatan pada Alur Formulir Checkout / Pembayaran',
      severityScore: 75,
      description: 'Pengunjung telah berniat membeli dan membuka formulir pemesanan, namun membatalkan transaksi pada tahap pengisian data atau pembayaran.',
      signals: checkoutSignals,
      action: 'Uji langsung alur pemesanan di perangkat seluler (smartphone). Ringkas kolom formulir, sediakan opsi pembayaran instan (seperti QRIS / Virtual Account), dan pastikan ongkos kirim transparan.',
      dontDo: 'Jangan langsung menurunkan harga produk. Masalahnya terletak pada friksi formulir atau metode pembayaran, bukan minat produk.',
      priority: 'HIGH',
      strongSignal: (checkoutStarts || 0) >= 20 && (purchaseRate !== null && purchaseRate < 15.0),
    });
  }

  // =========================================================================
  // CANDIDATE E: ADS WEAK APPEAL (Low CTR, High CPC, without high frequency)
  // =========================================================================
  const isWeakCtr = ctr < 1.05 && linkClicks > 15;
  const isExpensiveCpc = cpc > (targets.targetCpc ? targets.targetCpc * 1.35 : 4500);

  if (isWeakCtr && (isExpensiveCpc || cpa > targets.targetCpa) && frequency < 2.3) {
    const adsSignals: string[] = [
      `CTR iklan rendah: ${ctr}% (di bawah batas target minimal 1.2% - 1.5%)`,
      `Biaya per klik (CPC): Rp${cpc.toLocaleString('id-ID')}`,
    ];

    detectedIssues.push({
      bottleneck: 'ADS',
      title: 'Daya Tarik Iklan Rendah (Weak Hook / Low CTR)',
      severityScore: 70,
      description: 'Materi iklan belum berhasil memikat audiens target saat scrolling di feed Meta, sehingga rasio klik rendah dan biaya mendatangkan visitor mahal.',
      signals: adsSignals,
      action: 'Buat variasi materi iklan baru dengan hook 3 detik pertama yang lebih tajam, kontras visual tinggi, dan solusi yang relevan dengan problem utama audiens.',
      dontDo: 'Jangan merombak landing page sebelum Anda berhasil mendatangkan traffic yang cukup dengan CTR di atas 1.2%.',
      priority: 'MEDIUM',
      strongSignal: ctr < 0.8,
    });
  }

  // =========================================================================
  // CANDIDATE F: OFFER PROBLEM (Funnel flow okay, but ROAS bad / margin loss)
  // =========================================================================
  if (
    roas < (targets.minAcceptableRoas || targets.targetRoas * 0.8) &&
    cpa > targets.breakEvenCpa &&
    purchases >= 3 &&
    detectedIssues.length === 0
  ) {
    const offerSignals: string[] = [
      `ROAS saat ini: ${roas.toFixed(2)}x (Target: ${targets.targetRoas}x)`,
      `CPA: Rp${cpa.toLocaleString('id-ID')} (Break-even: Rp${targets.breakEvenCpa.toLocaleString('id-ID')})`,
      cpaEvaluationText,
    ];

    detectedIssues.push({
      bottleneck: 'OFFER',
      title: 'Margin & Daya Tarik Penawaran (Offer / Pricing Resistance)',
      severityScore: 68,
      description: 'Alur traffic dan konversi berjalan, namun biaya per akuisisi melampaui margin keuntungan produk. Terjadi resistensi pada harga atau paket penawaran.',
      signals: offerSignals,
      action: 'Tingkatkan Average Order Value (AOV) dengan strategi bundling produk, upsell saat checkout, atau uji paket promo bonus untuk meningkatkan margin per transaksi.',
      dontDo: 'Jangan menurunkan margin lebih jauh dengan diskon potongan harga langsung.',
      priority: 'HIGH',
      strongSignal: cpa > targets.breakEvenCpa * 1.3,
    });
  }

  // =========================================================================
  // RESOLUTION: DETECT PRIMARY BOTTLENECK & SECONDARY ISSUE
  // =========================================================================
  // Sort candidates by severity score descending
  detectedIssues.sort((a, b) => b.severityScore - a.severityScore);

  if (detectedIssues.length > 0) {
    const primary = detectedIssues[0];
    const secondary = detectedIssues.length > 1 ? detectedIssues[1] : null;

    // Collect evidence
    primary.signals.forEach((s) => evidence.push(s));
    if (cpaEvaluationText) evidence.push(cpaEvaluationText);
    if (secondary) {
      evidence.push(`Isu Sekunder Terdeteksi: ${secondary.title} (${secondary.signals[0] || ''})`);
    }

    // Determine deterministic confidence based on signal strength & quantity
    const signalCount = primary.signals.length + (secondary ? 1 : 0);
    let confidence: ConfidenceLevel = 'High';
    if (primary.strongSignal || signalCount >= 3) {
      confidence = 'High';
    } else if (signalCount === 2) {
      confidence = 'Medium';
    } else {
      confidence = 'Low';
    }

    return {
      primaryBottleneck: primary.bottleneck,
      secondaryIssue: secondary ? `${secondary.title}: ${secondary.description}` : null,
      confidence,
      bottleneckTitle: primary.title,
      headlineSummary: `${primary.description} ${secondary ? `Selain itu, teridentifikasi isu sekunder pada ${secondary.title}.` : ''}`,
      detailedReason: `${primary.description} Fokuskan tindakan perbaikan pertama pada ${primary.title} sebelum menangani area lainnya.`,
      evidence,
      recommendedAction: primary.action,
      dontDoYet: primary.dontDo,
      priority: primary.priority,
    };
  }

  // =========================================================================
  // SCENARIO G / H: HEALTHY FUNNEL (or High Frequency with Stable Great Performance)
  // =========================================================================
  if (roas >= (targets.minAcceptableRoas || targets.targetRoas * 0.85) && cpa <= targets.targetCpa) {
    evidence.push(`ROAS: ${roas.toFixed(2)}x (Target: ${targets.targetRoas}x)`);
    evidence.push(`CPA: Rp${cpa.toLocaleString('id-ID')} (Target CPA: Rp${targets.targetCpa.toLocaleString('id-ID')})`);
    evidence.push(cpaEvaluationText);
    if (lpMetrics) {
      evidence.push(`Landing page engagement sehat (Scroll: ${lpMetrics.avgScrollDepth}%, Quick Back: ${quickBackRate ?? 0}%)`);
    }
    if (frequency >= 2.0) {
      evidence.push(`Frekuensi ${frequency.toFixed(2)}x tinggi namun performa tetap solid (CTR ${ctr}%, CPC Rp${cpc.toLocaleString('id-ID')}).`);
    }

    return {
      primaryBottleneck: 'HEALTHY',
      secondaryIssue: null,
      confidence: purchases >= 5 ? 'High' : 'Medium',
      bottleneckTitle: 'Seluruh Alur Funnel Berjalan Harmonis & Menguntungkan',
      headlineSummary: `Performa Meta Ads dan Landing Page berada di atas target bisnis dengan ROAS ${roas.toFixed(2)}x dan ${cpaEvaluationText}`,
      detailedReason: 'Kesesuaian pesan dari materi iklan, kenyamanan membaca landing page, hingga kemudahan proses pembayaran terbukti bekerja efektif mengonversi visitor menjadi pembeli.',
      evidence,
      recommendedAction: 'Pertahankan materi yang berjalan dan lakukan scale budget secara gradual 15% - 20% setiap 3 - 4 hari.',
      dontDoYet: 'Jangan melakukan perombakan drastis pada materi iklan utama atau copywriting landing page.',
      priority: 'MAINTAIN',
    };
  }

  // =========================================================================
  // SCENARIO I: CPA ABOVE TARGET BUT BELOW BREAK-EVEN (Profitable / Optimization warning)
  // =========================================================================
  if (purchases > 0 && cpa > targets.targetCpa && cpa <= targets.breakEvenCpa) {
    evidence.push(`ROAS: ${roas.toFixed(2)}x | CTR: ${ctr}% | CPC: Rp${cpc.toLocaleString('id-ID')}`);
    evidence.push(cpaEvaluationText);
    if (lpMetrics) {
      evidence.push(`Sesi LP: ${lpMetrics.sessions} | Scroll: ${lpMetrics.avgScrollDepth}%`);
    }

    return {
      primaryBottleneck: 'MONITOR',
      secondaryIssue: null,
      confidence: 'Medium',
      bottleneckTitle: 'Performa Masih Menghasilkan Profit (Perlu Optimasi CPA)',
      headlineSummary: `CPA saat ini (Rp${cpa.toLocaleString('id-ID')}) berada di atas target CPA namun masih di bawah break-even. Unit ekonomi masih menghasilkan profit kotor.`,
      detailedReason: 'Iklan dan landing page beroperasi dengan layak. Optimasi ringan pada hook iklan atau variasi paket penawaran dapat membantu menekan CPA kembali ke target ideal.',
      evidence,
      recommendedAction: 'Lakukan uji coba 1 - 2 variasi hook iklan baru dan pantau pergerakan CPA harian tanpa mematikan campaign utama.',
      dontDoYet: 'Hindari mematikan campaign yang masih menghasilkan profit kotor.',
      priority: 'LOW',
    };
  }

  // =========================================================================
  // SCENARIO J: MISSING LP METRICS & UNKNOWN ROOT CAUSE
  // =========================================================================
  if (!lpMetrics) {
    evidence.push(`Spend terkumpul: Rp${spend.toLocaleString('id-ID')} | Clicks: ${linkClicks}`);
    evidence.push(`ROAS: ${roas.toFixed(2)}x | CPA: Rp${cpa.toLocaleString('id-ID')}`);
    evidence.push('Data telemetri perilaku Landing Page (Microsoft Clarity / Event Pixel) belum terhubung.');

    return {
      primaryBottleneck: 'UNKNOWN',
      secondaryIssue: null,
      confidence: 'Medium',
      bottleneckTitle: 'Data Telemetri Landing Page Belum Terhubung',
      headlineSummary: `Terdeteksi penurunan konversi (CPA Rp${cpa.toLocaleString('id-ID')}), namun data perilaku pengunjung di landing page belum tersedia untuk mendiagnosis titik kebocoran.`,
      detailedReason: 'Meta Ads berhasil mendatangkan traffic, namun tanpa data telemetri landing page (seperti Scroll Depth, Quick Back, atau Script Errors), sistem tidak dapat memastikan apakah kendala berada pada kecepatan web, konten halaman, atau alur pembayaran.',
      evidence,
      recommendedAction: 'Hubungkan integrasi Microsoft Clarity atau lengkapi pelacakan Meta Pixel Standard Events (ViewContent, InitiateCheckout) untuk diagnosis akurat.',
      dontDoYet: 'Jangan merombak landing page atau mengganti creative secara membabi buta tanpa data telemetri yang jelas.',
      priority: 'HIGH',
    };
  }

  // Default Monitor Fallback
  evidence.push(`ROAS: ${roas.toFixed(2)}x | CTR: ${ctr}% | CPC: Rp${cpc.toLocaleString('id-ID')}`);
  if (cpaEvaluationText) evidence.push(cpaEvaluationText);

  return {
    primaryBottleneck: 'MONITOR',
    secondaryIssue: null,
    confidence: 'Medium',
    bottleneckTitle: 'Alur Funnel Berada dalam Batas Wajar (Perlu Pemantauan)',
    headlineSummary: `Metrik berada dalam rentang toleransi operasional. ${cpaEvaluationText}`,
    detailedReason: 'Belum ditemukan anomali kritis yang mendesak. Pantau kestabilan performa harian selama 24 - 48 jam ke depan.',
    evidence,
    recommendedAction: 'Pantau konsistensi konversi harian sebelum memutuskan perubahan materi iklan atau struktur halaman web.',
    dontDoYet: 'Hindari pergantian strategi secara mendadak.',
    priority: 'LOW',
  };
}

/**
 * Diagnoses the funnel bottleneck and returns the full FunnelDiagnosisResult
 * with backward-compatible 4 stages and the new 7-stage consistent model.
 * Strictly adheres to DATA INTEGRITY: Never fabricates missing metrics.
 */
export function diagnoseFunnelBottleneck(
  metaMetrics: PerformanceMetrics,
  targets: BusinessTargets,
  lpMetrics?: LandingPageBehaviorMetrics,
  lpEvaluation?: LandingPageEvaluation,
  previousMetrics?: PerformanceMetrics,
  coverageMetadata?: FunnelDataCoverage
): FunnelDiagnosisResult {
  // 1. Unified Funnel Stage Raw Counts
  const impressions = metaMetrics.impressions;
  const linkClicks = metaMetrics.linkClicks ?? metaMetrics.clicks;
  
  // Real landing page views: strictly use reported sessions/views or null if unmeasured (Never fabricates linkClicks * 0.85)
  const landingPageViews = metaMetrics.landingPageViews !== undefined && metaMetrics.landingPageViews !== null
    ? metaMetrics.landingPageViews
    : (lpMetrics?.sessions !== undefined && lpMetrics?.sessions !== null ? lpMetrics.sessions : null);
  
  // Engaged visitors: null until explicit engaged_session event is tracked (Never fabricates sessions * scrollDepth or * 0.60)
  const engagedVisitors = null;

  // Real checkout starts: strictly use Meta initiateCheckout or LP checkoutStarts or null (Never fabricates purchases * 2)
  const checkoutStarts = metaMetrics.initiateCheckout !== undefined && metaMetrics.initiateCheckout !== null
    ? metaMetrics.initiateCheckout
    : (lpMetrics?.checkoutStarts !== undefined && lpMetrics?.checkoutStarts !== null ? lpMetrics.checkoutStarts : null);

  const ctaClicks = lpMetrics?.ctaClicks !== undefined && lpMetrics?.ctaClicks !== null ? lpMetrics.ctaClicks : null;
  const purchases = metaMetrics.purchases;

  // Rate Calculations (pure number or null)
  const ctr = metaMetrics.ctr;
  const lpViewRate = calculateLpViewRate(landingPageViews, linkClicks);
  const engagementRate = null;
  const ctaClickRate = calculateCtaClickRate(ctaClicks, landingPageViews ?? lpMetrics?.sessions ?? null);
  const checkoutRate = calculateCheckoutRate(checkoutStarts, landingPageViews ?? lpMetrics?.sessions ?? null);
  const purchaseRate = calculatePurchaseRate(purchases, checkoutStarts);

  // Dropoff calculations (strictly null if either stage is unknown)
  const dropoffLinkToLp = (linkClicks > 0 && landingPageViews !== null)
    ? Math.max(0, Number(((1 - landingPageViews / linkClicks) * 100).toFixed(1)))
    : null;

  const dropoffLpToCheckout = (landingPageViews !== null && landingPageViews > 0 && checkoutStarts !== null)
    ? Math.max(0, Number(((1 - checkoutStarts / landingPageViews) * 100).toFixed(1)))
    : null;

  const dropoffCheckoutToPurchase = (checkoutStarts !== null && checkoutStarts > 0 && purchases >= 0)
    ? Math.max(0, Number(((1 - purchases / checkoutStarts) * 100).toFixed(1)))
    : null;

  // Biggest dropoff determination: only considers measured stages
  const candidateDropoffs: { stage: string; percentage: number }[] = [];
  if (dropoffLinkToLp !== null) {
    candidateDropoffs.push({ stage: 'Klik Iklan ke Loading Landing Page', percentage: dropoffLinkToLp });
  }
  if (dropoffLpToCheckout !== null) {
    candidateDropoffs.push({ stage: 'Landing Page ke Checkout', percentage: dropoffLpToCheckout });
  }
  if (dropoffCheckoutToPurchase !== null) {
    candidateDropoffs.push({ stage: 'Formulir Checkout ke Pembayaran', percentage: dropoffCheckoutToPurchase });
  }

  let biggestDropoffStage: string | null = null;
  let dropoffPercentage: number | null = null;

  if (candidateDropoffs.length > 0) {
    candidateDropoffs.sort((a, b) => b.percentage - a.percentage);
    biggestDropoffStage = candidateDropoffs[0].stage;
    dropoffPercentage = candidateDropoffs[0].percentage;
  }

  const stageMetrics: FunnelStageMetrics = {
    impressions,
    linkClicks,
    landingPageViews,
    engagedVisitors,
    ctaClicks,
    checkoutStarts,
    purchases,
    ctr,
    lpViewRate,
    engagementRate,
    ctaClickRate,
    checkoutRate,
    purchaseRate,
    biggestDropoffStage,
    dropoffPercentage,
  };

  // 2. Run Deterministic Bottleneck Detection
  const detection = detectPrimaryBottleneck(
    metaMetrics,
    targets,
    lpMetrics,
    lpEvaluation,
    previousMetrics
  );

  // 3. Build Consistent 7-Stage Funnel Model
  const funnelStages: FunnelStageItem[] = [
    {
      name: 'Impression',
      stageKey: 'impression',
      value: impressions > 0 ? impressions : 0,
      conversionRate: null,
      dropOffRate: null,
      status: impressions > 0 ? 'HEALTHY' : 'INSUFFICIENT_DATA',
      evidence: [`${impressions.toLocaleString('id-ID')} tayangan di Meta Ads feed`],
      source: 'META',
    },
    {
      name: 'Link Click',
      stageKey: 'link_click',
      value: linkClicks > 0 ? linkClicks : 0,
      conversionRate: ctr > 0 ? ctr : null,
      dropOffRate: ctr > 0 ? Math.max(0, Number((100 - ctr).toFixed(1))) : null,
      status: detection.primaryBottleneck === 'ADS' || detection.primaryBottleneck === 'CREATIVE'
        ? 'PROBLEM'
        : (ctr < 1.2 ? 'MONITOR' : 'HEALTHY'),
      evidence: [`CTR: ${ctr}%`, `CPC: Rp${metaMetrics.cpc.toLocaleString('id-ID')}`],
      source: 'META',
    },
    {
      name: 'Landing Page View',
      stageKey: 'landing_page_view',
      value: landingPageViews,
      conversionRate: lpViewRate,
      dropOffRate: dropoffLinkToLp,
      status: landingPageViews === null 
        ? 'UNKNOWN'
        : (detection.primaryBottleneck === 'LANDING_PAGE_TECHNICAL'
          ? 'PROBLEM'
          : (lpViewRate !== null && lpViewRate < 72 ? 'MONITOR' : 'HEALTHY')),
      evidence: landingPageViews !== null
        ? [`View Rate: ${lpViewRate !== null ? `${lpViewRate}%` : 'N/A'} (${landingPageViews} sesi dari ${linkClicks} klik)`]
        : ['Metrik Landing Page View belum terlacak (Pixel ViewContent / Clarity belum aktif)'],
      source: metaMetrics.landingPageViews !== undefined ? 'META' : (lpMetrics?.sessions !== undefined ? 'CLARITY' : 'UNKNOWN'),
    },
    {
      name: 'Engaged Visitor',
      stageKey: 'engaged_visitor',
      value: null,
      conversionRate: null,
      dropOffRate: null,
      status: lpMetrics ? (lpMetrics.avgScrollDepth >= 50 ? 'HEALTHY' : (lpMetrics.avgScrollDepth >= 35 ? 'MONITOR' : 'PROBLEM')) : 'UNKNOWN',
      evidence: lpMetrics 
        ? [`Rata-rata Scroll: ${lpMetrics.avgScrollDepth}%`, `Waktu Baca: ${lpMetrics.avgEngagementTime} detik`]
        : ['Telemetri perilaku membaca (Clarity) belum terhubung'],
      source: lpMetrics ? 'CLARITY' : 'UNKNOWN',
    },
    {
      name: 'CTA Click',
      stageKey: 'cta_click',
      value: ctaClicks,
      conversionRate: ctaClickRate,
      dropOffRate: null,
      status: ctaClicks === null 
        ? 'UNKNOWN' 
        : (ctaClickRate !== null && ctaClickRate < 4.0 ? 'MONITOR' : 'HEALTHY'),
      evidence: ctaClicks !== null
        ? [`${ctaClicks} klik tombol aksi (CTA)`, `Tingkat klik CTA: ${ctaClickRate !== null ? `${ctaClickRate}%` : 'N/A'}`]
        : ['Event klik CTA (Custom Event) tidak terlacak'],
      source: ctaClicks !== null ? 'CUSTOM_EVENT' : 'UNKNOWN',
    },
    {
      name: 'Checkout',
      stageKey: 'checkout',
      value: checkoutStarts,
      conversionRate: checkoutRate,
      dropOffRate: dropoffLpToCheckout,
      status: checkoutStarts === null
        ? 'UNKNOWN'
        : (detection.primaryBottleneck === 'CHECKOUT'
          ? 'PROBLEM'
          : (purchaseRate !== null && purchaseRate < 25 ? 'MONITOR' : 'HEALTHY')),
      evidence: checkoutStarts !== null
        ? [`${checkoutStarts} inisiasi formulir checkout`, `Tingkat inisiasi: ${checkoutRate !== null ? `${checkoutRate}%` : 'N/A'}`]
        : ['Event Initiate Checkout tidak terlacak di Pixel atau Form'],
      source: metaMetrics.initiateCheckout !== undefined ? 'META' : (lpMetrics?.checkoutStarts !== undefined ? 'CUSTOM_EVENT' : 'UNKNOWN'),
    },
    {
      name: 'Purchase',
      stageKey: 'purchase',
      value: purchases >= 0 ? purchases : null,
      conversionRate: purchaseRate !== null ? purchaseRate : (linkClicks > 0 ? Number(((purchases / linkClicks) * 100).toFixed(1)) : null),
      dropOffRate: dropoffCheckoutToPurchase,
      status: metaMetrics.roas >= targets.targetRoas
        ? 'HEALTHY'
        : (metaMetrics.cpa > targets.breakEvenCpa ? 'PROBLEM' : 'MONITOR'),
      evidence: [
        `${purchases} transaksi berhasil`,
        `CPA: Rp${metaMetrics.cpa.toLocaleString('id-ID')}`,
        `ROAS: ${metaMetrics.roas.toFixed(2)}x`
      ],
      source: 'META',
    },
  ];

  // 4. Backward-compatible 4-stage UI blocks
  const adsStatus: FunnelStageStatus = {
    stageName: 'Meta Ads',
    status: (detection.primaryBottleneck === 'ADS' || detection.primaryBottleneck === 'CREATIVE') 
      ? 'PROBLEM' 
      : (ctr < 1.4 ? 'MONITOR' : 'HEALTHY'),
    score: Math.min(100, Math.round((ctr / (targets.targetCtr || 1.8)) * 80)),
    highlightText: `CTR ${ctr}% | CPC Rp${metaMetrics.cpc.toLocaleString('id-ID')}`,
  };

  const lpStatus: FunnelStageStatus = {
    stageName: 'Landing Page',
    status: (landingPageViews === null && !lpMetrics)
      ? 'UNKNOWN'
      : ((detection.primaryBottleneck === 'LANDING_PAGE_TECHNICAL' || detection.primaryBottleneck === 'LANDING_PAGE_CONTENT') 
        ? 'PROBLEM' 
        : (lpEvaluation?.status || (lpViewRate !== null && lpViewRate < 75 ? 'MONITOR' : 'HEALTHY'))),
    score: lpEvaluation?.healthScore ?? (lpViewRate !== null ? Math.round(lpViewRate) : null),
    highlightText: lpMetrics
      ? `View Rate ${lpViewRate !== null ? `${lpViewRate}%` : 'N/A'} | Scroll ${lpMetrics.avgScrollDepth}%`
      : (lpViewRate !== null ? `View Rate ${lpViewRate}%` : 'Telemetri LP Belum Terhubung'),
  };

  const checkoutStatus: FunnelStageStatus = {
    stageName: 'Checkout',
    status: checkoutStarts === null
      ? 'UNKNOWN'
      : (detection.primaryBottleneck === 'CHECKOUT' ? 'PROBLEM' : (checkoutStarts > 0 && purchaseRate !== null && purchaseRate < 30 ? 'MONITOR' : 'HEALTHY')),
    score: purchaseRate !== null ? Math.min(100, Math.round(purchaseRate * 2.5)) : null,
    highlightText: checkoutStarts !== null
      ? `${checkoutStarts} Dimulai | ${purchases} Beli (${purchaseRate !== null ? `${purchaseRate}%` : 'N/A'})`
      : `${purchases} Beli (Tracking Checkout N/A)`,
  };

  const offerStatus: FunnelStageStatus = {
    stageName: 'Offer',
    status: (metaMetrics.roas >= targets.targetRoas) ? 'HEALTHY' : (metaMetrics.roas < 1.5 ? 'PROBLEM' : 'MONITOR'),
    score: Math.min(100, Math.round((metaMetrics.roas / targets.targetRoas) * 85)),
    highlightText: `ROAS ${metaMetrics.roas.toFixed(2)}x | CPA Rp${metaMetrics.cpa.toLocaleString('id-ID')}`,
  };

  const dataCoverage: FunnelDataCoverage = coverageMetadata || {
    metaCoveragePercent: 100,
    lpCoveragePercent: lpMetrics ? 100 : (landingPageViews !== null ? 60 : 0),
    ctaTracked: ctaClicks !== null,
    checkoutTracked: checkoutStarts !== null,
    notes: [
      metaMetrics.landingPageViews !== undefined ? 'Meta LP View terhubung' : 'Meta LP View N/A',
      lpMetrics ? 'Clarity behavioral metrics terhubung' : 'Clarity N/A',
    ],
  };

  return {
    mainBottleneck: detection.primaryBottleneck,
    primaryBottleneck: detection.primaryBottleneck,
    secondaryIssue: detection.secondaryIssue,
    bottleneckTitle: detection.bottleneckTitle,
    headlineSummary: detection.headlineSummary,
    detailedReason: detection.detailedReason,
    stages: [adsStatus, lpStatus, checkoutStatus, offerStatus],
    funnelStages,
    metrics: stageMetrics,
    dataCoverage,
    evidence: detection.evidence,
    recommendedAction: detection.recommendedAction,
    dontDoYet: detection.dontDoYet,
    confidence: detection.confidence,
    priority: detection.priority,
  };
}

/**
 * Aggregates landing page data across multiple pages connected to active campaigns.
 * Strictly uses weighted averages for rate/duration metrics and sums for occurrence counts.
 */
export interface AggregatedLandingPageResult {
  aggregatedMetrics?: LandingPageBehaviorMetrics;
  aggregatedEvaluation?: LandingPageEvaluation;
  coverage: FunnelDataCoverage;
}

export function aggregateLandingPageMetrics(
  landingPages: any[],
  activeCampaignIds?: string[],
  metaMetrics?: PerformanceMetrics
): AggregatedLandingPageResult {
  if (!landingPages || landingPages.length === 0) {
    return {
      aggregatedMetrics: undefined,
      aggregatedEvaluation: undefined,
      coverage: {
        metaCoveragePercent: 100,
        lpCoveragePercent: 0,
        coverageType: 'unknown',
        ctaTracked: false,
        checkoutTracked: false,
        notes: ['Tidak ada landing page yang terdaftar.'],
      },
    };
  }

  // Filter landing pages connected to active campaigns
  const relevantPages = landingPages.filter((lp) => {
    if (!activeCampaignIds || activeCampaignIds.length === 0) return true;
    const linkedIds: string[] | undefined = lp.linkedCampaignIds || lp.profile?.linkedCampaignIds;
    if (!linkedIds || linkedIds.length === 0) return false;
    return linkedIds.some((id: string) => activeCampaignIds.includes(id));
  });

  const pagesWithMetrics = relevantPages.filter((lp) => lp.metrics && lp.metrics.sessions > 0);

  if (pagesWithMetrics.length === 0) {
    return {
      aggregatedMetrics: undefined,
      aggregatedEvaluation: undefined,
      coverage: {
        metaCoveragePercent: 100,
        lpCoveragePercent: 0,
        coverageType: relevantPages.length > 0 ? 'page' : 'unknown',
        ctaTracked: false,
        checkoutTracked: false,
        notes: ['Belum ada sesi yang terekam pada landing page terkait.'],
      },
    };
  }

  let totalSessions = 0;
  let totalRageClicks = 0;
  let totalDeadClicks = 0;
  let totalQuickBacks = 0;
  let totalScriptErrors = 0;
  let totalExcessiveScrolls = 0;

  let weightedScrollSum = 0;
  let scrollSessionSum = 0;

  let weightedEngagementSum = 0;
  let engagementSessionSum = 0;

  let ctaPagesCount = 0;
  let totalCtaClicks: number | undefined = undefined;

  let checkoutPagesCount = 0;
  let totalCheckoutStarts: number | undefined = undefined;

  let purchasesPagesCount = 0;
  let totalPurchases: number | undefined = undefined;

  for (const lp of pagesWithMetrics) {
    const m = lp.metrics!;
    totalSessions += m.sessions;
    totalRageClicks += m.rageClicks || 0;
    totalDeadClicks += m.deadClicks || 0;
    totalQuickBacks += m.quickBacks || 0;
    totalScriptErrors += m.scriptErrors || 0;
    totalExcessiveScrolls += m.excessiveScrolls || 0;

    if (m.avgScrollDepth !== undefined && m.avgScrollDepth !== null) {
      weightedScrollSum += m.avgScrollDepth * m.sessions;
      scrollSessionSum += m.sessions;
    }

    if (m.avgEngagementTime !== undefined && m.avgEngagementTime !== null) {
      weightedEngagementSum += m.avgEngagementTime * m.sessions;
      engagementSessionSum += m.sessions;
    }

    if (m.ctaClicks !== undefined && m.ctaClicks !== null) {
      ctaPagesCount++;
      totalCtaClicks = (totalCtaClicks || 0) + m.ctaClicks;
    }

    if (m.checkoutStarts !== undefined && m.checkoutStarts !== null) {
      checkoutPagesCount++;
      totalCheckoutStarts = (totalCheckoutStarts || 0) + m.checkoutStarts;
    }

    if (m.purchases !== undefined && m.purchases !== null) {
      purchasesPagesCount++;
      totalPurchases = (totalPurchases || 0) + m.purchases;
    }
  }

  const avgScrollDepth = scrollSessionSum > 0 ? Math.round(weightedScrollSum / scrollSessionSum) : 0;
  const avgEngagementTime = engagementSessionSum > 0 ? Math.round(weightedEngagementSum / engagementSessionSum) : 0;

  const aggregatedMetrics: LandingPageBehaviorMetrics = {
    sessions: totalSessions,
    avgScrollDepth,
    avgEngagementTime,
    rageClicks: totalRageClicks,
    deadClicks: totalDeadClicks,
    quickBacks: totalQuickBacks,
    scriptErrors: totalScriptErrors,
    excessiveScrolls: totalExcessiveScrolls,
    ctaClicks: totalCtaClicks,
    checkoutStarts: totalCheckoutStarts,
    purchases: totalPurchases,
  };

  const aggregatedEvaluation = evaluateLandingPageHealth(aggregatedMetrics, 'Landing Page Agregat Akun');

  // Traffic-based coverage calculation if traffic denominator is available
  const totalRelevantTraffic = metaMetrics?.landingPageViews ?? (metaMetrics?.linkClicks && metaMetrics.linkClicks > 0 ? metaMetrics.linkClicks : null);
  let lpCoveragePercent: number;
  let coverageType: 'traffic' | 'page' | 'unknown';

  if (totalRelevantTraffic !== null && totalRelevantTraffic > 0 && totalSessions > 0) {
    lpCoveragePercent = Math.min(100, Math.round((totalSessions / totalRelevantTraffic) * 100));
    coverageType = 'traffic';
  } else if (relevantPages.length > 0) {
    lpCoveragePercent = Math.round((pagesWithMetrics.length / relevantPages.length) * 100);
    coverageType = 'page';
  } else {
    lpCoveragePercent = 0;
    coverageType = 'unknown';
  }

  return {
    aggregatedMetrics,
    aggregatedEvaluation,
    coverage: {
      metaCoveragePercent: 100,
      lpCoveragePercent,
      coverageType,
      ctaTracked: ctaPagesCount > 0,
      checkoutTracked: checkoutPagesCount > 0,
      notes: [
        coverageType === 'traffic'
          ? `Traffic coverage: ${totalSessions.toLocaleString('id-ID')} sesi LP dari ${totalRelevantTraffic?.toLocaleString('id-ID')} traffic relevan (${lpCoveragePercent}%).`
          : `Mencakup ${pagesWithMetrics.length} dari ${relevantPages.length} landing page aktif (${lpCoveragePercent}% page coverage).`,
        `Total sesi LP teragregasi: ${totalSessions.toLocaleString('id-ID')}`,
      ],
    },
  };
}

/**
 * Account-level Funnel Diagnosis across active campaigns and mapped landing pages.
 */
export function diagnoseFunnel(
  metaMetrics: PerformanceMetrics,
  landingPages: any[],
  targets: BusinessTargets,
  previousMetrics?: PerformanceMetrics,
  activeCampaignIds?: string[]
): FunnelDiagnosisResult {
  const aggregated = aggregateLandingPageMetrics(landingPages, activeCampaignIds, metaMetrics);

  return diagnoseFunnelBottleneck(
    metaMetrics,
    targets,
    aggregated.aggregatedMetrics,
    aggregated.aggregatedEvaluation,
    previousMetrics,
    aggregated.coverage
  );
}

/**
 * Campaign-specific Funnel Diagnosis helper for deep-dive campaign evaluation.
 */
export function diagnoseCampaignFunnel(
  campaignMetrics: PerformanceMetrics,
  campaignId: string,
  landingPages: any[],
  targets: BusinessTargets,
  previousMetrics?: PerformanceMetrics
): FunnelDiagnosisResult {
  const aggregated = aggregateLandingPageMetrics(landingPages, [campaignId], campaignMetrics);

  return diagnoseFunnelBottleneck(
    campaignMetrics,
    targets,
    aggregated.aggregatedMetrics,
    aggregated.aggregatedEvaluation,
    previousMetrics,
    aggregated.coverage
  );
}

