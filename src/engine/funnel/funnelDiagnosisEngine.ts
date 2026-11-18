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

const isKnown = (val: number | null | undefined): val is number =>
  val !== null && val !== undefined && typeof val === 'number' && Number.isFinite(val);

const fmtIdNumber = (val: number | null | undefined): string =>
  isKnown(val) ? val.toLocaleString('id-ID') : 'N/A';

const fmtRp = (val: number | null | undefined): string =>
  isKnown(val) ? `Rp${Math.round(val).toLocaleString('id-ID')}` : 'N/A';

const fmtRoas = (val: number | null | undefined): string =>
  isKnown(val) ? `${val.toFixed(2)}x` : 'N/A';

const fmtFreq = (val: number | null | undefined): string =>
  isKnown(val) ? `${val.toFixed(2)}x` : 'N/A';

const fmtPct = (val: number | null | undefined): string =>
  isKnown(val) ? `${val}%` : 'N/A';

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

  // Relative Trends (if previous period exists and values are known)
  const ctrTrend = previousMetrics && isKnown(previousMetrics.ctr) && previousMetrics.ctr > 0 && isKnown(ctr)
    ? calculatePercentChange(ctr, previousMetrics.ctr)
    : null;
  const cpcTrend = previousMetrics && isKnown(previousMetrics.cpc) && previousMetrics.cpc > 0 && isKnown(cpc)
    ? calculatePercentChange(cpc, previousMetrics.cpc)
    : null;
  const freqTrend = previousMetrics && isKnown(previousMetrics.frequency) && previousMetrics.frequency > 0 && isKnown(frequency)
    ? calculatePercentChange(frequency, previousMetrics.frequency)
    : null;

  // Rate helpers (pure numbers or null)
  const lpViewRate = calculateLpViewRate(landingPageViews, linkClicks);
  const quickBackRate = lpMetrics ? calculateSafeRate(lpMetrics.quickBacks, lpMetrics.sessions) : null;
  const rageClickRate = lpMetrics ? calculateSafeRate(lpMetrics.rageClicks, lpMetrics.sessions) : null;
  const ctaClickRateVal = calculateCtaClickRate(ctaClicks, sessions);
  const checkoutRate = calculateCheckoutRate(checkoutStarts, sessions);
  const purchaseRate = calculatePurchaseRate(purchases, checkoutStarts);

  // Business Target Profitability Classification (only when purchases > 0 and CPA is known)
  let cpaEvaluationText = '';
  if (isKnown(purchases) && purchases > 0 && isKnown(cpa)) {
    if (cpa <= targets.targetCpa) {
      cpaEvaluationText = `CPA (${fmtRp(cpa)}) berada dalam batas target (<= ${fmtRp(targets.targetCpa)}).`;
    } else if (cpa <= targets.breakEvenCpa) {
      cpaEvaluationText = `CPA (${fmtRp(cpa)}) di atas target CPA (${fmtRp(targets.targetCpa)}) namun masih di bawah batas break-even (${fmtRp(targets.breakEvenCpa)}) — transaksi masih menghasilkan profit kotor.`;
    } else {
      cpaEvaluationText = `CPA (${fmtRp(cpa)}) telah melebihi break-even CPA (${fmtRp(targets.breakEvenCpa)}) — unit ekonomi mengalami kerugian operasional per transaksi.`;
    }
  }

  const evidence: string[] = [];

  const isConfirmedZeroLp = Boolean(
    isKnown(linkClicks) &&
      linkClicks >= 25 &&
      landingPageViews === 0 &&
      lpMetrics !== undefined &&
      lpMetrics.sessions === 0
  );

  // =========================================================================
  // RULE 1: INSUFFICIENT DATA & UNAVAILABLE METRICS PROTECTION
  // =========================================================================
  const isDataUnavailable = metaMetrics.dataAvailability === 'UNAVAILABLE' || !isKnown(spend) || !isKnown(impressions);
  const isLowSpendNoPurchase = isKnown(spend) && spend < targets.targetCpa * 0.7 && (purchases === 0 || !isKnown(purchases));
  const isSmallSample =
    (isKnown(impressions) && impressions < 800) ||
    (isKnown(linkClicks) && linkClicks < 25) ||
    (sessions !== undefined && sessions < 30);

  if (!isConfirmedZeroLp && (isDataUnavailable || isLowSpendNoPurchase || (purchases === 0 && isSmallSample))) {
    evidence.push(`Total spend saat ini: ${fmtRp(spend)} (Ambang batas 0.7x Target CPA: ${fmtRp(targets.targetCpa * 0.7)})`);
    evidence.push(`Tayangan: ${fmtIdNumber(impressions)} (Standar minimal uji: 800)`);
    evidence.push(`Link clicks: ${fmtIdNumber(linkClicks)} | Sesi LP: ${sessions !== undefined ? sessions : 'N/A'}`);
    if (purchases === 0) {
      evidence.push('Belum ada transaksi purchase yang tercatat.');
    } else if (!isKnown(purchases)) {
      evidence.push('Data konversi purchase belum tersedia (N/A).');
    }

    return {
      primaryBottleneck: 'INSUFFICIENT_DATA',
      secondaryIssue: null,
      confidence: 'High',
      bottleneckTitle: isDataUnavailable ? 'Data Metrik Belum Tersedia' : 'Data Belum Cukup untuk Kesimpulan Statistik',
      headlineSummary: isDataUnavailable
        ? 'Belum ada data insight Meta Ads yang tersedia pada periode ini atau sinkronisasi belum memuat metrik performa.'
        : `Spend saat ini (${fmtRp(spend)}) dan volume interaksi belum memenuhi batas minimum signifikansi statistik.`,
      detailedReason: isDataUnavailable
        ? 'Metrik spend, tayangan, atau konversi belum tercatat dari Meta Graph API pada rentang tanggal ini. Pastikan akun memiliki campaign aktif dan event tracking telah terpasang.'
        : 'Algoritma lelang Meta Ads masih dalam fase pembelajaran (learning phase), dan sample visitor belum cukup besar untuk menarik kesimpulan mengenai performa iklan ataupun landing page.',
      evidence,
      recommendedAction: isDataUnavailable
        ? 'Pastikan akun iklan memiliki campaign aktif dengan delivery berjalan atau periksa rentang tanggal & koneksi API.'
        : 'Biarkan campaign mengumpulkan data statistik minimal mencapai 1x Target CPA atau minimal 50+ sesi landing page.',
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
  // CANDIDATE A: TECHNICAL LP PROBLEM (Requires corroborating technical evidence)
  // Low LP View Rate alone without Clarity/technical telemetry is treated as a hypothesis, not a confirmed crash.
  // =========================================================================
  const isScriptCrash = Boolean(lpMetrics && lpMetrics.scriptErrors >= 8);
  const isLpViewLeak = Boolean(
    isKnown(linkClicks) &&
      linkClicks >= 25 &&
      lpViewRate !== null &&
      lpViewRate < 72.0 &&
      (isKnown(metaMetrics.landingPageViews) || sessions !== undefined)
  );
  const isHighRage = Boolean(rageClickRate !== null && rageClickRate >= 7.0 && (lpMetrics?.rageClicks || 0) >= 5);
  const hasTechnicalEvidence = isScriptCrash || isHighRage || isConfirmedZeroLp;
  const hasUnconfirmedLpViewHypothesis = isLpViewLeak && !hasTechnicalEvidence;

  if (hasTechnicalEvidence) {
    const techSignals: string[] = [];
    let severity = 85;
    let isVeryStrong = false;

    if (isLpViewLeak && lpViewRate !== null) {
      techSignals.push(`LP View Rate hanya ${lpViewRate}% dari ${fmtIdNumber(linkClicks)} klik iklan (kebocoran loading: ${(100 - lpViewRate).toFixed(1)}%)`);
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
    if (isConfirmedZeroLp) {
      techSignals.push(`Terkonfirmasi 0 Landing Page Views dan 0 sesi Clarity dari ${fmtIdNumber(linkClicks)} link clicks.`);
      severity += 15;
      isVeryStrong = true;
    }

    detectedIssues.push({
      bottleneck: 'LANDING_PAGE_TECHNICAL',
      title: 'Kendala Teknis & Kecepatan Memuat Landing Page',
      severityScore: severity,
      description: 'Pengunjung yang tertarik mengklik iklan terhalang oleh loading halaman yang lambat, halaman tidak termuat, atau error script JavaScript di browser.',
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
  const isHighFreq = isKnown(frequency) && (frequency >= 2.4 || (freqTrend !== null && freqTrend >= 20));
  const isCtrDropping = isKnown(ctr) && ((ctrTrend !== null && ctrTrend <= -15) || ctr < (targets.targetCtr ? targets.targetCtr * 0.75 : 1.25));
  const isCpcRising = isKnown(cpc) && ((cpcTrend !== null && cpcTrend >= 15) || cpc > (targets.targetCpc ? targets.targetCpc * 1.3 : 4000));
  const isPerformanceDropping = (isKnown(roas) && roas < (targets.targetRoas || 2.5)) || (isKnown(cpa) && cpa > targets.targetCpa);

  if (isHighFreq && isCtrDropping && isCpcRising && isPerformanceDropping) {
    const creativeSignals: string[] = [
      `Frequency tinggi di angka ${fmtFreq(frequency)} ${freqTrend !== null ? `(naik +${freqTrend.toFixed(1)}%)` : ''}`,
      `CTR turun ke ${fmtPct(ctr)} ${ctrTrend !== null ? `(${ctrTrend.toFixed(1)}% vs periode lalu)` : ''}`,
      `Biaya per klik (CPC) membengkak menjadi ${fmtRp(cpc)} ${cpcTrend !== null ? `(+${cpcTrend.toFixed(1)}%)` : ''}`,
    ];

    detectedIssues.push({
      bottleneck: 'CREATIVE',
      title: 'Kelelahan Materi Kreatif (Creative Fatigue)',
      severityScore: 80,
      description: 'Kombinasi frekuensi penayangan tinggi, penurunan rasio klik (CTR), dan kenaikan biaya per klik (CPC) menunjukkan audiens target telah jenuh melihat materi iklan ini.',
      signals: creativeSignals,
      action: 'Unggah 2 - 3 variasi materi kreatif baru dengan visual hook berbeda (rotasi format video UGC / Carousel) untuk menyegarkan audiens.',
      dontDo: 'Jangan menaikkan budget harian pada materi yang sedang mengalami fatigue.',
      priority: isKnown(cpa) && cpa > targets.breakEvenCpa ? 'CRITICAL' : 'HIGH',
      strongSignal: (freqTrend !== null && freqTrend >= 30) || (isKnown(frequency) && frequency >= 2.8),
    });
  }

  // =========================================================================
  // CANDIDATE C: LP CONTENT & MESSAGE MISMATCH
  // Requires actual lpMetrics to prevent hallucinating LP issues (Scenario J)
  // =========================================================================
  if (lpMetrics && (sessions || 0) >= 25) {
    const isGoodTraffic = ((isKnown(ctr) && ctr >= 1.2) || (isKnown(linkClicks) && linkClicks >= 30)) && (lpViewRate === null || lpViewRate >= 68.0);
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
      `Sebanyak ${checkoutStarts} checkout diinisiasi, namun hanya ${isKnown(purchases) ? purchases : 'N/A'} yang selesai membayar`,
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
  const isWeakCtr = isKnown(ctr) && ctr < 1.05 && isKnown(linkClicks) && linkClicks > 15;
  const isExpensiveCpc = isKnown(cpc) && cpc > (targets.targetCpc ? targets.targetCpc * 1.35 : 4500);
  const isUnderFreq = !isKnown(frequency) || frequency < 2.3;
  const hasPostClickLpContext = landingPageViews !== null || lpMetrics !== undefined;

  if (isWeakCtr && (isExpensiveCpc || (isKnown(cpa) && cpa > targets.targetCpa)) && isUnderFreq && hasPostClickLpContext) {
    const adsSignals: string[] = [
      `CTR iklan rendah: ${fmtPct(ctr)} (di bawah batas target minimal 1.2% - 1.5%)`,
      `Biaya per klik (CPC): ${fmtRp(cpc)}`,
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
      strongSignal: isKnown(ctr) && ctr < 0.8,
    });
  }

  // =========================================================================
  // CANDIDATE F: OFFER PROBLEM (Funnel flow okay, but ROAS bad / margin loss)
  // =========================================================================
  if (
    isKnown(roas) &&
    roas < (targets.minAcceptableRoas || targets.targetRoas * 0.8) &&
    isKnown(cpa) &&
    cpa > targets.breakEvenCpa &&
    isKnown(purchases) &&
    purchases >= 3 &&
    detectedIssues.length === 0
  ) {
    const offerSignals: string[] = [
      `ROAS saat ini: ${fmtRoas(roas)} (Target: ${targets.targetRoas}x)`,
      `CPA: ${fmtRp(cpa)} (Break-even: ${fmtRp(targets.breakEvenCpa)})`,
      ...(cpaEvaluationText ? [cpaEvaluationText] : []),
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
  if (
    isKnown(roas) &&
    isKnown(cpa) &&
    roas >= (targets.minAcceptableRoas || targets.targetRoas * 0.85) &&
    cpa <= targets.targetCpa
  ) {
    evidence.push(`ROAS: ${fmtRoas(roas)} (Target: ${targets.targetRoas}x)`);
    evidence.push(`CPA: ${fmtRp(cpa)} (Target CPA: ${fmtRp(targets.targetCpa)})`);
    if (cpaEvaluationText) evidence.push(cpaEvaluationText);
    if (lpMetrics) {
      evidence.push(`Landing page engagement sehat (Scroll: ${lpMetrics.avgScrollDepth}%, Quick Back: ${quickBackRate ?? 'N/A'}%)`);
    }
    if (isKnown(frequency) && frequency >= 2.0) {
      evidence.push(`Frekuensi ${fmtFreq(frequency)} tinggi namun performa tetap solid (CTR ${fmtPct(ctr)}, CPC ${fmtRp(cpc)}).`);
    }

    return {
      primaryBottleneck: 'HEALTHY',
      secondaryIssue: null,
      confidence: isKnown(purchases) && purchases >= 5 ? 'High' : 'Medium',
      bottleneckTitle: 'Seluruh Alur Funnel Berjalan Harmonis & Menguntungkan',
      headlineSummary: `Performa Meta Ads dan Landing Page berada di atas target bisnis dengan ROAS ${fmtRoas(roas)} dan ${cpaEvaluationText}`,
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
  if (isKnown(purchases) && purchases > 0 && isKnown(cpa) && cpa > targets.targetCpa && cpa <= targets.breakEvenCpa) {
    evidence.push(`ROAS: ${fmtRoas(roas)} | CTR: ${fmtPct(ctr)} | CPC: ${fmtRp(cpc)}`);
    if (cpaEvaluationText) evidence.push(cpaEvaluationText);
    if (lpMetrics) {
      evidence.push(`Sesi LP: ${lpMetrics.sessions} | Scroll: ${lpMetrics.avgScrollDepth}%`);
    }

    return {
      primaryBottleneck: 'MONITOR',
      secondaryIssue: null,
      confidence: 'Medium',
      bottleneckTitle: 'Performa Masih Menghasilkan Profit (Perlu Optimasi CPA)',
      headlineSummary: `CPA saat ini (${fmtRp(cpa)}) berada di atas target CPA namun masih di bawah break-even. Unit ekonomi masih menghasilkan profit kotor.`,
      detailedReason: 'Iklan dan landing page beroperasi dengan layak. Optimasi ringan pada hook iklan atau variasi paket penawaran dapat membantu menekan CPA kembali ke target ideal.',
      evidence,
      recommendedAction: 'Lakukan uji coba 1 - 2 variasi hook iklan baru dan pantau pergerakan CPA harian tanpa mematikan campaign utama.',
      dontDoYet: 'Hindari mematikan campaign yang masih menghasilkan profit kotor.',
      priority: 'LOW',
    };
  }

  // =========================================================================
  // SCENARIO J: MISSING LP METRICS & UNKNOWN ROOT CAUSE (OR UNCONFIRMED HYPOTHESIS)
  // =========================================================================
  if (!lpMetrics) {
    evidence.push(`Spend terkumpul: ${fmtRp(spend)} | Clicks: ${fmtIdNumber(linkClicks)}`);
    evidence.push(`ROAS: ${fmtRoas(roas)} | CPA: ${fmtRp(cpa)}`);
    if (hasUnconfirmedLpViewHypothesis && lpViewRate !== null) {
      evidence.push(
        `Hipotesis Teknis / Tracking (Belum Terkonfirmasi): LP View Rate Meta tercatat ${lpViewRate}% (${fmtIdNumber(landingPageViews)} dari ${fmtIdNumber(linkClicks)} klik), namun belum ada telemetri browser (Clarity/PageSpeed) untuk membedakan bottleneck kecepatan loading vs selisih tracking Pixel.`
      );
    }
    evidence.push('Data telemetri perilaku Landing Page (Microsoft Clarity / Script Error) belum terhubung.');

    return {
      primaryBottleneck: 'UNKNOWN',
      secondaryIssue: hasUnconfirmedLpViewHypothesis && lpViewRate !== null
        ? `Hipotesis Awal (Belum Terkonfirmasi): Selisih Link Click ke LP View (${lpViewRate}%) berpotensi berasal dari latency loading mobile, redirect, atau blocking Pixel.`
        : null,
      confidence: hasUnconfirmedLpViewHypothesis ? 'Low' : 'Medium',
      bottleneckTitle: hasUnconfirmedLpViewHypothesis
        ? 'Hipotesis Kebocoran Landing Page (Belum Terkonfirmasi Bukti Teknis)'
        : 'Data Telemetri Landing Page Belum Terhubung',
      headlineSummary: hasUnconfirmedLpViewHypothesis && lpViewRate !== null
        ? `Hipotesis Awal: LP View Rate tercatat ${lpViewRate}%, namun tanpa telemetri teknis browser (Clarity/PageSpeed), sistem belum dapat memastikan apakah ini kendala loading teknis atau selisih pelacakan Pixel.`
        : isKnown(cpa)
        ? `Terdeteksi penurunan konversi (CPA ${fmtRp(cpa)}), namun data perilaku pengunjung di landing page belum tersedia untuk mendiagnosis titik kebocoran.`
        : 'Data konversi/revenue belum lengkap dan telemetri perilaku pengunjung di landing page belum tersedia untuk mendiagnosis titik kebocoran.',
      detailedReason: hasUnconfirmedLpViewHypothesis
        ? 'Angka LP View Rate rendah dari Meta Ads saja belum cukup untuk menyimpulkan crash teknis atau error JavaScript karena bisa dipengaruhi keterlambatan loading Pixel, redirect URL, atau ad-blocker pengguna.'
        : 'Meta Ads berhasil mendatangkan traffic, namun tanpa data telemetri landing page (seperti Scroll Depth, Quick Back, atau Script Errors), sistem tidak dapat memastikan apakah kendala berada pada kecepatan web, konten halaman, atau alur pembayaran.',
      evidence,
      recommendedAction: hasUnconfirmedLpViewHypothesis
        ? 'Uji kecepatan memuat halaman di mobile (PageSpeed/Lighthouse) dan verifikasi penembakan event PageView Meta Pixel sebelum menyimpulkan kerusakan teknis.'
        : 'Hubungkan integrasi Microsoft Clarity atau lengkapi pelacakan Meta Pixel Standard Events (ViewContent, InitiateCheckout) untuk diagnosis akurat.',
      dontDoYet: 'Jangan langsung menyimpulkan crash JavaScript atau merombak landing page secara membabi buta tanpa verifikasi telemetri teknis.',
      priority: hasUnconfirmedLpViewHypothesis ? 'MEDIUM' : 'HIGH',
    };
  }

  // Default Monitor Fallback
  evidence.push(`ROAS: ${fmtRoas(roas)} | CTR: ${fmtPct(ctr)} | CPC: ${fmtRp(cpc)}`);
  if (cpaEvaluationText) evidence.push(cpaEvaluationText);
  if (hasUnconfirmedLpViewHypothesis && lpViewRate !== null) {
    evidence.push(
      `Hipotesis (Belum Terkonfirmasi Bukti Crash): LP View Rate ${lpViewRate}% dengan 0 error JS kritis & rage click normal — periksa latency redirect atau firing Meta Pixel.`
    );
  }

  return {
    primaryBottleneck: 'MONITOR',
    secondaryIssue: hasUnconfirmedLpViewHypothesis && lpViewRate !== null
      ? `Hipotesis (Belum Terkonfirmasi): LP View Rate ${lpViewRate}% tanpa bukti script error/rage click kritis.`
      : null,
    confidence: 'Medium',
    bottleneckTitle: 'Alur Funnel Berada dalam Batas Wajar (Perlu Pemantauan)',
    headlineSummary: `Metrik berada dalam rentang toleransi operasional. ${cpaEvaluationText || 'Sebagian metrik konversi atau revenue belum terlaporkan lengkap.'}`.trim(),
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
  const dropoffLinkToLp = (isKnown(linkClicks) && linkClicks > 0 && landingPageViews !== null)
    ? Math.max(0, Number(((1 - landingPageViews / linkClicks) * 100).toFixed(1)))
    : null;

  const dropoffLpToCheckout = (landingPageViews !== null && landingPageViews > 0 && checkoutStarts !== null)
    ? Math.max(0, Number(((1 - checkoutStarts / landingPageViews) * 100).toFixed(1)))
    : null;

  const dropoffCheckoutToPurchase = (checkoutStarts !== null && checkoutStarts > 0 && isKnown(purchases) && purchases >= 0)
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
      value: isKnown(impressions) ? impressions : null,
      conversionRate: null,
      dropOffRate: null,
      status: isKnown(impressions) && impressions > 0 ? 'HEALTHY' : 'INSUFFICIENT_DATA',
      evidence: [
        isKnown(impressions)
          ? `${impressions.toLocaleString('id-ID')} tayangan di Meta Ads feed`
          : 'Data tayangan belum tersedia (N/A)',
      ],
      source: isKnown(impressions) ? 'META' : 'UNKNOWN',
    },
    {
      name: 'Link Click',
      stageKey: 'link_click',
      value: isKnown(linkClicks) ? linkClicks : null,
      conversionRate: isKnown(ctr) && ctr > 0 ? ctr : null,
      dropOffRate: isKnown(ctr) && ctr > 0 ? Math.max(0, Number((100 - ctr).toFixed(1))) : null,
      status: !isKnown(ctr)
        ? 'INSUFFICIENT_DATA'
        : detection.primaryBottleneck === 'ADS' || detection.primaryBottleneck === 'CREATIVE'
        ? 'PROBLEM'
        : ctr < 1.2
        ? 'MONITOR'
        : 'HEALTHY',
      evidence: [`CTR: ${fmtPct(ctr)}`, `CPC: ${fmtRp(metaMetrics.cpc)}`],
      source: isKnown(linkClicks) ? 'META' : 'UNKNOWN',
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
        ? [`View Rate: ${lpViewRate !== null ? `${lpViewRate}%` : 'N/A'} (${fmtIdNumber(landingPageViews)} sesi dari ${fmtIdNumber(linkClicks)} klik)`]
        : ['Metrik Landing Page View belum terlacak (Pixel ViewContent / Clarity belum aktif)'],
      source: isKnown(metaMetrics.landingPageViews) ? 'META' : (lpMetrics?.sessions !== undefined ? 'CLARITY' : 'UNKNOWN'),
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
      source: isKnown(metaMetrics.initiateCheckout) ? 'META' : (lpMetrics?.checkoutStarts !== undefined ? 'CUSTOM_EVENT' : 'UNKNOWN'),
    },
    {
      name: 'Purchase',
      stageKey: 'purchase',
      value: isKnown(purchases) && purchases >= 0 ? purchases : null,
      conversionRate: purchaseRate !== null
        ? purchaseRate
        : (isKnown(linkClicks) && linkClicks > 0 && isKnown(purchases)
          ? Number(((purchases / linkClicks) * 100).toFixed(1))
          : null),
      dropOffRate: dropoffCheckoutToPurchase,
      status: !isKnown(purchases)
        ? 'UNKNOWN'
        : isKnown(metaMetrics.roas) && metaMetrics.roas >= targets.targetRoas
        ? 'HEALTHY'
        : isKnown(metaMetrics.cpa) && metaMetrics.cpa > targets.breakEvenCpa
        ? 'PROBLEM'
        : 'MONITOR',
      evidence: [
        isKnown(purchases) ? `${purchases} transaksi berhasil` : 'Transaksi: Data belum tersedia (N/A)',
        `CPA: ${fmtRp(metaMetrics.cpa)}`,
        `ROAS: ${fmtRoas(metaMetrics.roas)}`
      ],
      source: isKnown(purchases) ? 'META' : 'UNKNOWN',
    },
  ];

  // 4. Backward-compatible 4-stage UI blocks
  const adsStatus: FunnelStageStatus = {
    stageName: 'Meta Ads',
    status: !isKnown(ctr)
      ? 'INSUFFICIENT_DATA'
      : (detection.primaryBottleneck === 'ADS' || detection.primaryBottleneck === 'CREATIVE') 
      ? 'PROBLEM' 
      : (ctr < 1.4 ? 'MONITOR' : 'HEALTHY'),
    score: isKnown(ctr) ? Math.min(100, Math.round((ctr / (targets.targetCtr || 1.8)) * 80)) : null,
    highlightText: `CTR ${fmtPct(ctr)} | CPC ${fmtRp(metaMetrics.cpc)}`,
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
      ? `${checkoutStarts} Dimulai | ${isKnown(purchases) ? purchases : 'N/A'} Beli (${purchaseRate !== null ? `${purchaseRate}%` : 'N/A'})`
      : `${isKnown(purchases) ? `${purchases} Beli` : 'Pembelian N/A'} (Tracking Checkout N/A)`,
  };

  const offerStatus: FunnelStageStatus = {
    stageName: 'Offer',
    status: !isKnown(metaMetrics.roas)
      ? 'INSUFFICIENT_DATA'
      : (metaMetrics.roas >= targets.targetRoas) ? 'HEALTHY' : (metaMetrics.roas < 1.5 ? 'PROBLEM' : 'MONITOR'),
    score: isKnown(metaMetrics.roas) && targets.targetRoas > 0
      ? Math.min(100, Math.round((metaMetrics.roas / targets.targetRoas) * 85))
      : null,
    highlightText: `ROAS ${fmtRoas(metaMetrics.roas)} | CPA ${fmtRp(metaMetrics.cpa)}`,
  };

  const dataCoverage: FunnelDataCoverage = coverageMetadata || {
    metaCoveragePercent: metaMetrics.dataAvailability === 'UNAVAILABLE' ? 0 : (metaMetrics.dataAvailability === 'PARTIAL' ? 50 : 100),
    lpCoveragePercent: lpMetrics ? 100 : (landingPageViews !== null ? 60 : 0),
    ctaTracked: ctaClicks !== null,
    checkoutTracked: checkoutStarts !== null,
    notes: [
      isKnown(metaMetrics.landingPageViews) ? 'Meta LP View terhubung' : 'Meta LP View N/A',
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
  const totalRelevantTraffic = metaMetrics?.landingPageViews ?? (isKnown(metaMetrics?.linkClicks) && metaMetrics!.linkClicks! > 0 ? metaMetrics!.linkClicks! : null);
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

