export interface GlossaryTerm {
  term: string;
  shortName: string;
  simpleExplanation: string;
  idealRange: string;
  warningSign: string;
}

export const META_ADS_GLOSSARY: Record<string, GlossaryTerm> = {
  ROAS: {
    term: 'Return on Ad Spend (ROAS)',
    shortName: 'ROAS',
    simpleExplanation: 'Berapa rupiah omzet yang Anda dapatkan dari setiap Rp1 yang Anda belanjakan untuk iklan.',
    idealRange: 'Di atas Target ROAS Anda (misal > 3.0x untuk produk digital).',
    warningSign: 'Jika ROAS di bawah Break-Even ROAS, artinya campaign sedang merugi.',
  },
  CPA: {
    term: 'Cost per Acquisition / Purchase (CPA)',
    shortName: 'CPA / Biaya per Pembeli',
    simpleExplanation: 'Rata-rata biaya iklan yang dihabiskan untuk mendapatkan 1 penjualan produk.',
    idealRange: 'Harus di bawah Target CPA dan tidak boleh melebihi Break-Even CPA.',
    warningSign: 'CPA naik tajam menandakan penawaran jenuh atau audience tidak merespon.',
  },
  CTR: {
    term: 'Click-Through Rate (CTR)',
    shortName: 'CTR / Rasio Klik',
    simpleExplanation: 'Persentase orang yang mengklik iklan setelah melihatnya di feed/reels.',
    idealRange: 'Umumnya > 1.5% - 2.5% untuk produk digital.',
    warningSign: 'Jika CTR turun di bawah 1%, berarti hook atau thumbnail kurang menarik perhatian.',
  },
  CPC: {
    term: 'Cost per Click (CPC)',
    shortName: 'CPC / Biaya per Klik',
    simpleExplanation: 'Biaya yang Anda bayar kepada Meta untuk setiap 1 klik link ke landing page.',
    idealRange: 'Rp1.000 - Rp2.500 (tergantung niche).',
    warningSign: 'CPC yang melonjak biasanya diiringi penurunan CTR atau naiknya persaingan CPM.',
  },
  CPM: {
    term: 'Cost per Mille (CPM)',
    shortName: 'CPM / Biaya per 1.000 Tayang',
    simpleExplanation: 'Biaya untuk menampilkan iklan Anda sebanyak 1.000 kali ke hadapan pengguna.',
    idealRange: 'Rp15.000 - Rp45.000 di Indonesia untuk broad/lookalike.',
    warningSign: 'CPM melonjak saat musim lelang ramai (tanggal gajian, Harbolnas) atau audience terlalu sempit.',
  },
  Frequency: {
    term: 'Frequency (Frekuensi Tayang)',
    shortName: 'Frequency',
    simpleExplanation: 'Rata-rata berapa kali satu orang yang sama telah melihat iklan Anda.',
    idealRange: '1.2 - 2.2 untuk audience cold (baru).',
    warningSign: 'Frequency > 3.0 menandakan audience sudah jenuh melihat iklan yang sama berulang kali.',
  },
  CreativeFatigue: {
    term: 'Creative Fatigue (Kelelahan Iklan)',
    shortName: 'Creative Fatigue',
    simpleExplanation: 'Kondisi ketika audiens sudah bosan melihat materi video/gambar yang sama berulang kali, sehingga respon menurun drastis.',
    idealRange: 'Lakukan rotasi konten baru setiap 2 - 3 minggu.',
    warningSign: 'Kombinasi CTR turun tajam, Frequency naik, dan CPC melonjak.',
  },
  BreakEvenCPA: {
    term: 'Break-Even CPA',
    shortName: 'Batas Rugi CPA',
    simpleExplanation: 'Batas maksimal biaya per penjualan di mana Anda tidak untung dan tidak rugi (margin kotor = 0).',
    idealRange: 'CPA riil wajib lebih rendah dari angka ini agar profit.',
    warningSign: 'Jika CPA riil melampaui angka ini, segera periksa creative atau landing page.',
  },
};
