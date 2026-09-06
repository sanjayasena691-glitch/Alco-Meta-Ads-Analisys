import { 
  LandingPageBehaviorMetrics, 
  LandingPageEvaluation, 
  LandingPageSignal, 
  LandingPageStatus, 
  ConfidenceLevel 
} from '../../../types';
import {
  calculateRageClickRate,
  calculateDeadClickRate,
  calculateQuickBackRate,
  calculateCtaClickRate,
  calculateCheckoutRate,
  calculatePurchaseRate,
} from '../../calculations/metrics';

export function evaluateLandingPageHealth(
  metrics: LandingPageBehaviorMetrics,
  landingPageName: string = 'Landing Page'
): LandingPageEvaluation {
  const {
    sessions,
    avgScrollDepth,
    avgEngagementTime,
    rageClicks,
    deadClicks,
    quickBacks,
    scriptErrors,
    ctaClicks,
    checkoutStarts,
    purchases,
  } = metrics;

  // 1. Strict Insufficient Data Protection (< 30 sessions)
  if (!sessions || sessions < 30) {
    const insufficientSignal: LandingPageSignal = {
      type: 'INSUFFICIENT_LP_DATA',
      title: 'Data Pengunjung Landing Page Belum Cukup',
      description: `Baru terkumpul ${sessions || 0} sesi visitor. Dibutuhkan minimal 30 - 50 sesi untuk mendeteksi pola perilaku pengguna yang reliabel.`,
      severity: 'info',
      evidence: [`Jumlah sesi saat ini: ${sessions || 0} sesi (ambang batas minimal: 30 sesi)`],
    };

    return {
      healthScore: 50,
      status: 'NOT_ENOUGH_DATA',
      signals: [insufficientSignal],
      primaryIssue: 'Sesi visitor di landing page belum mencukupi untuk evaluasi statistik yang valid.',
      recommendedAction: 'Biarkan iklan berjalan hingga mendatangkan minimal 50+ sesi ke halaman ini sebelum melakukan perombakan desain atau copywriting.',
      dontDoYet: 'Jangan mengubah struktur halaman web atau mematikan campaign Meta terburu-buru.',
      confidence: 'High',
    };
  }

  const signals: LandingPageSignal[] = [];
  let score = 100;

  // Calculate normalized rates safely
  const rageClickRate = calculateRageClickRate(rageClicks, sessions);
  const deadClickRate = calculateDeadClickRate(deadClicks, sessions);
  const quickBackRate = calculateQuickBackRate(quickBacks, sessions);
  const ctaClickRate = calculateCtaClickRate(ctaClicks, sessions);
  const checkoutRate = calculateCheckoutRate(checkoutStarts, sessions);
  const purchaseRate = calculatePurchaseRate(purchases, checkoutStarts);

  // 2. Script Error Spike (Technical crash - rate & occurrence)
  const scriptErrorRate = calculateRageClickRate(scriptErrors, sessions);
  if (scriptErrors >= 8 || (scriptErrorRate !== null && scriptErrorRate >= 3)) {
    score -= 30;
    signals.push({
      type: 'SCRIPT_ERROR_SPIKE',
      title: 'Lonjakan Script Error (Kendala Teknis Browser)',
      description: `${scriptErrors} script error terdeteksi. Script JavaScript yang crash di mobile dapat mencegah tombol beli, popup checkout, atau tracking pixel berfungsi.`,
      severity: 'critical',
      evidence: [
        `${scriptErrors} error runtime JavaScript pada ${sessions} sesi (${(scriptErrorRate ?? 0).toFixed(1)}% rasio error)`,
        'Berpotensi memblokir alur interaksi dan pembayaran pengunjung',
      ],
    });
  } else if (scriptErrors >= 2) {
    score -= 10;
    signals.push({
      type: 'SCRIPT_ERROR_SPIKE',
      title: 'Terdeteksi Beberapa Script Error Minor',
      description: 'Ada error script di browser pengunjung yang perlu diaudit oleh tim teknis.',
      severity: 'warning',
      evidence: [`${scriptErrors} script error terdeteksi pada ${sessions} sesi`],
    });
  }

  // 3. Rage Clicks (Rate-based evaluation with raw count supporting)
  if (rageClickRate !== null && rageClickRate >= 7.0 && rageClicks >= 5) {
    score -= 25;
    signals.push({
      type: 'HIGH_RAGE_CLICK',
      title: 'Tingkat Rage Click Tinggi (> 7% Sesi Pengunjung)',
      description: 'Pengunjung mengklik satu elemen berkali-kali secara cepat. Biasanya terjadi karena tombol checkout lambat merespons atau terasa macet di smartphone.',
      severity: 'critical',
      evidence: [
        `Rage Click Rate: ${rageClickRate}% (${rageClicks} klik frustrasi dari ${sessions} sesi)`,
        'Mengindikasikan frustrasi pengunjung pada alur interaksi / tombol macet',
      ],
    });
  } else if (rageClickRate !== null && rageClickRate >= 3.5 && rageClicks >= 3) {
    score -= 10;
    signals.push({
      type: 'HIGH_RAGE_CLICK',
      title: 'Rage Click Perlu Dipantau (>= 3.5%)',
      description: 'Terdapat indikasi pengunjung mengklik tombol lebih dari sekali karena respons tombol lambat.',
      severity: 'warning',
      evidence: [`Rage Click Rate: ${rageClickRate}% (${rageClicks} rage clicks)`],
    });
  }

  // 4. Dead Clicks (Rate-based evaluation)
  if (deadClickRate !== null && deadClickRate >= 12.0 && deadClicks >= 10) {
    score -= 15;
    signals.push({
      type: 'HIGH_DEAD_CLICK',
      title: 'Dead Click Signifikan (>= 12% Sesi Pengunjung)',
      description: 'Pengunjung mengklik mockup, tabel, atau kartu yang tidak memiliki hyperlink aktif. Hal ini membingungkan alur navigasi pengguna.',
      severity: 'warning',
      evidence: [
        `Dead Click Rate: ${deadClickRate}% (${deadClicks} dead clicks dari ${sessions} sesi)`,
        'Banyak pengunjung mengharapkan elemen visual tersebut bisa diklik',
      ],
    });
  }

  // 5. Scroll Depth (Content / Story flow)
  if (avgScrollDepth < 35) {
    score -= 25;
    signals.push({
      type: 'LOW_SCROLL_DEPTH',
      title: 'Rata-rata Scroll Depth Sangat Rendah (< 35%)',
      description: `Rata-rata pengunjung hanya scroll hingga ${avgScrollDepth}% tinggi halaman. Sebagian besar pengunjung keluar sebelum mencapai informasi harga atau tombol pembelian.`,
      severity: 'critical',
      evidence: [
        `Rata-rata kedalaman scroll: ${avgScrollDepth}% (Standar sehat: 50%+)`,
        'Banyak pengunjung tidak pernah melihat tawaran utama (offer)',
      ],
    });
  } else if (avgScrollDepth < 45) {
    score -= 15;
    signals.push({
      type: 'LOW_SCROLL_DEPTH',
      title: 'Scroll Depth di Bawah Standar (< 45%)',
      description: `Rata-rata kedalaman baca pengunjung (${avgScrollDepth}%) masih di bawah standar optimal e-commerce (50%+).`,
      severity: 'warning',
      evidence: [`Rata-rata scroll: ${avgScrollDepth}%`],
    });
  }

  // 6. Quick Backs (Bounce < 5s rate-based)
  if (quickBackRate !== null && quickBackRate >= 35.0) {
    score -= 25;
    signals.push({
      type: 'HIGH_QUICKBACK',
      title: 'Tingkat Quick Back Tinggi (> 35% Pengunjung Langsung Keluar)',
      description: `${quickBackRate}% pengunjung menekan tombol kembali (back) dalam waktu kurang dari 5 detik. Sinyal kuat ketidaksesuaian janji iklan (message mismatch) atau loading halaman yang lambat.`,
      severity: 'critical',
      evidence: [
        `Quick Back Rate: ${quickBackRate}% (${quickBacks} quick backs dari ${sessions} sesi)`,
        'Pengunjung merasa landing page tidak relevan dengan visual/hook yang diiklankan di Meta',
      ],
    });
  } else if (quickBackRate !== null && quickBackRate >= 20.0) {
    score -= 10;
    signals.push({
      type: 'HIGH_QUICKBACK',
      title: 'Quick Back Terindikasi Meningkat (>= 20%)',
      description: 'Sekitar 1 dari 5 pengunjung keluar sangat cepat setelah membuka halaman.',
      severity: 'warning',
      evidence: [`Quick Back Rate: ${quickBackRate}% (${quickBacks} sesi)`],
    });
  }

  // 7. Engagement Time
  if (avgEngagementTime < 20) {
    score -= 15;
    signals.push({
      type: 'LOW_ENGAGEMENT',
      title: 'Waktu Keterlibatan Rendah (< 20 detik)',
      description: `Rata-rata pengunjung hanya membaca selama ${avgEngagementTime} detik. Teks pembuka belum cukup menarik rasa ingin tahu pembaca.`,
      severity: 'warning',
      evidence: [`Rata-rata waktu aktif membaca: ${avgEngagementTime} detik`],
    });
  }

  // 8. Low CTA Interaction (Rate-based)
  if (ctaClickRate !== null && ctaClicks !== undefined && sessions >= 40) {
    if (ctaClickRate < 4.0) {
      score -= 10;
      signals.push({
        type: 'LOW_CTA_INTERACTION',
        title: 'Konversi Klik Tombol CTA Rendah (< 4%)',
        description: `Hanya ${ctaClickRate}% pengunjung yang menekan tombol aksi (CTA). Tombol mungkin kurang kontras, posisinya terlalu bawah, atau copy tombol kurang menggugah aksi.`,
        severity: 'warning',
        evidence: [`CTA Click Rate: ${ctaClickRate}% (${ctaClicks} klik CTA dari ${sessions} sesi)`],
      });
    }
  }

  // 9. Low Checkout Rate
  if (checkoutRate !== null && checkoutStarts !== undefined && sessions >= 40) {
    if (checkoutRate < 3.0 && (ctaClickRate === null || ctaClickRate < 5.0)) {
      score -= 10;
      signals.push({
        type: 'LOW_CHECKOUT_RATE',
        title: 'Tingkat Inisiasi Checkout Rendah (< 3%)',
        description: `Hanya ${checkoutRate}% pengunjung yang lanjut membuka formulir pemesanan.`,
        severity: 'warning',
        evidence: [`Checkout Rate: ${checkoutRate}% (${checkoutStarts} checkout dari ${sessions} sesi)`],
      });
    }
  }

  // 10. Low Purchase Conversion from Checkout
  if (purchaseRate !== null && purchases !== undefined && (checkoutStarts || 0) >= 5) {
    if (purchaseRate < 25.0) {
      score -= 15;
      signals.push({
        type: 'LOW_PURCHASE_CONVERSION',
        title: 'Konversi Pembayaran Checkout Rendah (< 25%)',
        description: `Dari ${checkoutStarts} orang yang masuk formulir, hanya ${purchaseRate}% yang menyelesaikan pembayaran.`,
        severity: 'warning',
        evidence: [`Purchase Rate: ${purchaseRate}% (${purchases} bayar dari ${checkoutStarts} checkout)`],
      });
    }
  }

  // Final Health Score & Status
  const healthScore = Math.max(0, Math.min(100, Math.round(score)));

  let status: LandingPageStatus = 'HEALTHY';
  let primaryIssue = 'Landing page bekerja optimal dengan tingkat keterlibatan pengunjung yang baik.';
  let recommendedAction = 'Pertahankan struktur halaman saat ini. Jadikan landing page ini referensi kontrol saat menguji variasi halaman baru.';
  let dontDoYet = 'Jangan merombak copywriting atau tata letak halaman utama ini tanpa A/B test terpisah.';

  const criticalSignals = signals.filter((s) => s.severity === 'critical');
  const warningSignals = signals.filter((s) => s.severity === 'warning');

  // Deterministic confidence based on signal quantity & consistency
  let confidence: ConfidenceLevel = 'High';
  const totalIssueSignals = criticalSignals.length + warningSignals.length;
  if (totalIssueSignals === 0) {
    confidence = sessions >= 50 ? 'High' : 'Medium';
  } else if (totalIssueSignals === 1) {
    confidence = 'Low';
  } else if (totalIssueSignals === 2) {
    confidence = 'Medium';
  } else {
    confidence = 'High';
  }

  if (criticalSignals.length > 0 || healthScore < 55) {
    status = 'PROBLEM';
    const top = criticalSignals[0] || warningSignals[0];
    primaryIssue = top ? top.title : 'Terdeteksi hambatan serius pada pengalaman pengunjung di landing page.';

    if (criticalSignals.some((s) => s.type === 'SCRIPT_ERROR_SPIKE')) {
      recommendedAction = 'Buka browser console, periksa error JavaScript pada perangkat mobile, dan pastikan form checkout dapat merespons klik dengan lancar.';
      dontDoYet = 'Jangan menyalahkan materi iklan Meta atau menaikkan budget sebelum script error ini diperbaiki.';
    } else if (criticalSignals.some((s) => s.type === 'HIGH_QUICKBACK' || s.type === 'LOW_SCROLL_DEPTH')) {
      recommendedAction = 'Selaraskan headline dan sub-headline landing page dengan janji pada 3 detik pertama video Meta Ads (Message Match). Geser elemen penawaran (offer) lebih ke atas.';
      dontDoYet = 'Jangan langsung menaikkan harga atau menambah teks panjang di atas fold yang membuat pengunjung enggan membaca.';
    } else if (criticalSignals.some((s) => s.type === 'HIGH_RAGE_CLICK')) {
      recommendedAction = 'Uji kecepatan respon tombol CTA di koneksi 4G mobile dan pastikan ada indikator loading saat tombol ditekan.';
      dontDoYet = 'Jangan mengubah copy penawaran sebelum tombol fisik dan alur checkout dipastikan bebas macet.';
    }
  } else if (warningSignals.length > 0 || healthScore < 75) {
    status = 'MONITOR';
    primaryIssue = warningSignals[0]?.title || 'Terdapat beberapa metrik perilaku pengunjung yang memerlukan optimasi ringan.';
    recommendedAction = 'Tinjau rekaman sesi (session recordings) di Microsoft Clarity pada area yang memiliki dead click atau penurunan scroll untuk menemukan titik friksi.';
    dontDoYet = 'Belum perlu melakukan redesign total. Lakukan perbaikan mikro pada tombol dan penataan konten.';
  }

  return {
    healthScore,
    status,
    signals,
    primaryIssue,
    recommendedAction,
    dontDoYet,
    confidence,
  };
}
