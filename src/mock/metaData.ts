import { 
  Campaign, 
  BusinessTargets, 
  MetaAdAccount, 
  DailyTrendPoint 
} from '../types';
import { calculateMetricsFromRaw } from '../engine/calculations/metrics';

export const DEFAULT_BUSINESS_TARGETS: BusinessTargets = {
  productName: 'ALCO Creative System',
  productPrice: 99_000,
  targetCpa: 30_000,
  breakEvenCpa: 55_000,
  targetRoas: 3.0,
  dailyBudget: 250_000,
  targetCtr: 1.8,
};

export const MOCK_TREND_DATA: DailyTrendPoint[] = [
  { date: '27 Agu', spend: 280_000, revenue: 990_000, roas: 3.53, cpa: 28_000, ctr: 2.3, cpc: 1850, cpm: 24_000, purchases: 10, frequency: 1.25 },
  { date: '28 Agu', spend: 310_000, revenue: 1_089_000, roas: 3.51, cpa: 28_180, ctr: 2.2, cpc: 1900, cpm: 25_500, purchases: 11, frequency: 1.35 },
  { date: '29 Agu', spend: 350_000, revenue: 1_188_000, roas: 3.39, cpa: 29_160, ctr: 2.1, cpc: 2050, cpm: 26_000, purchases: 12, frequency: 1.50 },
  { date: '30 Agu', spend: 390_000, revenue: 1_287_000, roas: 3.30, cpa: 30_000, ctr: 1.95, cpc: 2200, cpm: 27_800, purchases: 13, frequency: 1.72 },
  { date: '31 Agu', spend: 410_000, revenue: 1_188_000, roas: 2.90, cpa: 34_160, ctr: 1.70, cpc: 2450, cpm: 29_500, purchases: 12, frequency: 2.05 },
  { date: '01 Sep', spend: 430_000, revenue: 1_089_000, roas: 2.53, cpa: 39_090, ctr: 1.45, cpc: 2700, cpm: 31_000, purchases: 11, frequency: 2.38 },
  { date: '02 Sep', spend: 420_000, revenue: 1_260_000, roas: 3.00, cpa: 35_000, ctr: 1.55, cpc: 2650, cpm: 30_200, purchases: 12, frequency: 2.65 },
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  // 🟢 CAMPAIGN A: HEALTHY (Ebook & Template Bisnis)
  {
    id: 'camp_01',
    name: 'Campaign A - ALCO Ebook Conversions [Broad]',
    objective: 'OUTCOME_SALES',
    dailyBudget: 150_000,
    status: 'HEALTHY',
    metrics: calculateMetricsFromRaw(
      650_000,   // spend
      2_376_000, // revenue (24 * 99.000)
      24,        // purchases
      28_500,    // impressions
      22_000,    // reach
      684,       // clicks (CTR ~ 2.4%)
      {
        linkClicks: 650,
        outboundClicks: 650,
        landingPageViews: 605,
        addToCart: 95,
        initiateCheckout: 58,
      }
    ),
    previousMetrics: calculateMetricsFromRaw(
      600_000,
      1_980_000,
      20,
      25_000,
      20_500,
      575,
      {
        linkClicks: 540,
        outboundClicks: 540,
        landingPageViews: 500,
        addToCart: 80,
        initiateCheckout: 48,
      }
    ),
    adSets: [
      {
        id: 'adset_01_a',
        campaignId: 'camp_01',
        name: 'AdSet 01 - Broad Age 22-45 ID',
        targetingSummary: 'Indonesia, Usia 22-45, Broad Targeting, Advantage+ Placements',
        dailyBudget: 80_000,
        status: 'HEALTHY',
        metrics: calculateMetricsFromRaw(360_000, 1_386_000, 14, 15_800, 12_800, 395),
        previousMetrics: calculateMetricsFromRaw(330_000, 1_188_000, 12, 14_000, 11_500, 336),
        ads: [
          {
            id: 'ad_01_a_1',
            adSetId: 'adset_01_a',
            campaignId: 'camp_01',
            name: 'Creative Video 01 - Problem Agitation Framework',
            format: 'Video',
            hookText: '"Stop buang budget iklan tanpa tahu metric yang bocor!"',
            status: 'HEALTHY',
            metrics: calculateMetricsFromRaw(180_000, 792_000, 8, 8_100, 6_800, 218),
            previousMetrics: calculateMetricsFromRaw(160_000, 594_000, 6, 7_000, 6_000, 175),
            isWinner: true,
          },
          {
            id: 'ad_01_a_2',
            adSetId: 'adset_01_a',
            campaignId: 'camp_01',
            name: 'Creative Carousel 01 - 5 Kesalahan Ads Pemula',
            format: 'Carousel',
            hookText: 'Slide 1: "Kenapa ROAS Anda selalu di bawah 1.5x?"',
            status: 'HEALTHY',
            metrics: calculateMetricsFromRaw(120_000, 396_000, 4, 5_200, 4_300, 120),
            previousMetrics: calculateMetricsFromRaw(110_000, 396_000, 4, 4_800, 4_000, 105),
          },
          {
            id: 'ad_01_a_3',
            adSetId: 'adset_01_a',
            campaignId: 'camp_01',
            name: 'Creative Image 01 - Mockup Dashboard Minimalis',
            format: 'Image',
            hookText: 'Tampilan rapi visual metrik dalam satu genggaman',
            status: 'HEALTHY',
            metrics: calculateMetricsFromRaw(60_000, 198_000, 2, 2_500, 1_700, 57),
            previousMetrics: calculateMetricsFromRaw(60_000, 198_000, 2, 2_200, 1_500, 56),
          },
        ],
      },
      {
        id: 'adset_01_b',
        campaignId: 'camp_01',
        name: 'AdSet 02 - Interest Digital Marketing & Shopify',
        targetingSummary: 'Indonesia, Interest: E-commerce, Digital Marketing, Business Owner',
        dailyBudget: 70_000,
        status: 'HEALTHY',
        metrics: calculateMetricsFromRaw(290_000, 990_000, 10, 12_700, 9_200, 289),
        previousMetrics: calculateMetricsFromRaw(270_000, 792_000, 8, 11_000, 9_000, 239),
        ads: [
          {
            id: 'ad_01_b_1',
            adSetId: 'adset_01_b',
            campaignId: 'camp_01',
            name: 'Creative Video 02 - Studi Kasus Toko Online Omzet 50jt',
            format: 'Video',
            hookText: '"Dari boncos Rp2jt/hari jadi profit stabil 3.8x ROAS."',
            status: 'HEALTHY',
            metrics: calculateMetricsFromRaw(150_000, 594_000, 6, 6_800, 5_100, 163),
            previousMetrics: calculateMetricsFromRaw(140_000, 495_000, 5, 6_000, 4_800, 138),
            isWinner: true,
          },
          {
            id: 'ad_01_b_2',
            adSetId: 'adset_01_b',
            campaignId: 'camp_01',
            name: 'Creative Image 02 - Perbandingan Sebelum & Sesudah',
            format: 'Image',
            hookText: 'Kiri: Rumit Ads Manager. Kanan: Panduan Aksi ALCO.',
            status: 'HEALTHY',
            metrics: calculateMetricsFromRaw(90_000, 297_000, 3, 3_900, 2_700, 82),
            previousMetrics: calculateMetricsFromRaw(80_000, 198_000, 2, 3_400, 2_500, 68),
          },
          {
            id: 'ad_01_b_3',
            adSetId: 'adset_01_b',
            campaignId: 'camp_01',
            name: 'Creative Video 02B - Walkthrough 60 Detik',
            format: 'Video',
            hookText: 'Trik membaca grafik iklan tanpa pusing rumus matematika',
            status: 'HEALTHY',
            metrics: calculateMetricsFromRaw(50_000, 99_000, 1, 2_000, 1_400, 44),
            previousMetrics: calculateMetricsFromRaw(50_000, 99_000, 1, 1_600, 1_700, 33),
          },
        ],
      },
    ],
  },

  // 🟡/🔴 CAMPAIGN B: CREATIVE FATIGUE
  // Notice: Frequency high (3.7), CTR dropped 36%, CPC spiked, Video 03 fatigue!
  {
    id: 'camp_02',
    name: 'Campaign B - Freelance Masterclass Scale-Up',
    objective: 'OUTCOME_SALES',
    dailyBudget: 200_000,
    status: 'PROBLEM',
    metrics: calculateMetricsFromRaw(
      820_000,   // spend
      1_485_000, // revenue (15 * 99.000) -> ROAS 1.81 (turun dari 3.2!)
      15,        // purchases -> CPA 54.600 (mendekati break-even 55.000)
      32_000,    // impressions
      9_200,     // reach -> Frequency 3.48!
      368,       // clicks -> CTR 1.15% (turun drastis dari 1.80%)
      {
        linkClicks: 345,
        outboundClicks: 345,
        landingPageViews: 302,
        addToCart: 38,
        initiateCheckout: 24,
      }
    ),
    previousMetrics: calculateMetricsFromRaw(
      750_000,
      2_376_000, // revenue lalu 2.376.000
      24,
      30_000,
      14_200,    // Frequency lalu 2.11
      540,       // CTR lalu 1.80%
      {
        linkClicks: 510,
        outboundClicks: 510,
        landingPageViews: 470,
        addToCart: 62,
        initiateCheckout: 45,
      }
    ),
    adSets: [
      {
        id: 'adset_02_a',
        campaignId: 'camp_02',
        name: 'AdSet 01 - Lookalike 1% Buyers ID',
        targetingSummary: 'Indonesia, Lookalike 1% Custom Audience Pembeli Terakhir, Umur 20-35',
        dailyBudget: 120_000,
        status: 'PROBLEM',
        metrics: calculateMetricsFromRaw(510_000, 891_000, 9, 20_000, 5_400, 220),
        previousMetrics: calculateMetricsFromRaw(460_000, 1_485_000, 15, 18_500, 9_200, 333),
        ads: [
          {
            id: 'ad_02_a_1',
            adSetId: 'adset_02_a',
            campaignId: 'camp_02',
            name: 'Creative Video 03 - Hook Pertanyaan Freelancer',
            format: 'Video',
            hookText: '"Masih nawarin jasa Rp50rb di marketplace luar negeri?"',
            status: 'PROBLEM',
            // Detailed Creative Fatigue metrics:
            // CTR: 1.8% -> 1.15% (-36%)
            // Frequency: 2.1 -> 3.7 (+76%)
            // CPC: Rp1.900 -> Rp2.850 (+50%)
            metrics: calculateMetricsFromRaw(310_000, 495_000, 5, 12_800, 3_450, 147), // CTR 1.15%, Freq 3.71, CPC 2.108
            previousMetrics: calculateMetricsFromRaw(260_000, 990_000, 10, 10_500, 5_000, 189), // CTR 1.8%, Freq 2.1
          },
          {
            id: 'ad_02_a_2',
            adSetId: 'adset_02_a',
            campaignId: 'camp_02',
            name: 'Creative Image 03 - Testimonial Screenshot WhatsApp',
            format: 'Image',
            hookText: '"Alhamdulillah tembus $1,200 bulan pertama"',
            status: 'MONITOR',
            metrics: calculateMetricsFromRaw(130_000, 297_000, 3, 4_800, 1_500, 48),
            previousMetrics: calculateMetricsFromRaw(120_000, 396_000, 4, 5_000, 2_600, 90),
          },
          {
            id: 'ad_02_a_3',
            adSetId: 'adset_02_a',
            campaignId: 'camp_02',
            name: 'Creative Carousel 02 - Roadmap 0 ke 10 Juta',
            format: 'Carousel',
            hookText: 'Langkah demi langkah membangun portofolio jasa',
            status: 'MONITOR',
            metrics: calculateMetricsFromRaw(70_000, 99_000, 1, 2_400, 850, 25),
            previousMetrics: calculateMetricsFromRaw(80_000, 99_000, 1, 3_000, 1_600, 54),
          },
        ],
      },
      {
        id: 'adset_02_b',
        campaignId: 'camp_02',
        name: 'AdSet 02 - Interest Upwork & Fiverr',
        targetingSummary: 'Interest: Freelancer.com, Upwork, Fiverr, Remote work',
        dailyBudget: 80_000,
        status: 'MONITOR',
        metrics: calculateMetricsFromRaw(310_000, 594_000, 6, 12_000, 4_000, 148),
        previousMetrics: calculateMetricsFromRaw(290_000, 891_000, 9, 11_500, 5_400, 207),
        ads: [
          {
            id: 'ad_02_b_1',
            adSetId: 'adset_02_b',
            campaignId: 'camp_02',
            name: 'Creative Video 04 - Tips Bikin Proposal Klien',
            format: 'Video',
            hookText: '"Format proposal yang 80% lolos review klien US."',
            status: 'MONITOR',
            metrics: calculateMetricsFromRaw(160_000, 396_000, 4, 6_200, 2_100, 80),
            previousMetrics: calculateMetricsFromRaw(150_000, 495_000, 5, 5_800, 2_900, 110),
          },
          {
            id: 'ad_02_b_2',
            adSetId: 'adset_02_b',
            campaignId: 'camp_02',
            name: 'Creative Image 04 - Infografis Skill dengan Bayaran Tertinggi',
            format: 'Image',
            hookText: '5 Skill digital yang paling dicari bisnis luar negeri',
            status: 'MONITOR',
            metrics: calculateMetricsFromRaw(100_000, 198_000, 2, 4_100, 1_400, 49),
            previousMetrics: calculateMetricsFromRaw(90_000, 297_000, 3, 3_900, 1_800, 66),
          },
          {
            id: 'ad_02_b_3',
            adSetId: 'adset_02_b',
            campaignId: 'camp_02',
            name: 'Creative Carousel 03 - 3 Template Penawaran Klien',
            format: 'Carousel',
            hookText: 'Copy-paste template penawaran ini ke pesan LinkedIn',
            status: 'MONITOR',
            metrics: calculateMetricsFromRaw(50_000, 0, 0, 1_700, 680, 19),
            previousMetrics: calculateMetricsFromRaw(50_000, 99_000, 1, 1_800, 900, 31),
          },
        ],
      },
    ],
  },

  // 🔴 CAMPAIGN C: HIGH SPEND WITHOUT PURCHASE
  // Spend Rp220.000+, 0 purchases, high spend no purchase problem!
  {
    id: 'camp_03',
    name: 'Campaign C - Notion Productivity Hub [Cold Traffic]',
    objective: 'OUTCOME_SALES',
    dailyBudget: 100_000,
    status: 'PROBLEM',
    metrics: calculateMetricsFromRaw(
      220_000, // spend Rp220.000
      0,       // 0 revenue
      0,       // 0 purchase! (High spend no purchase alert)
      11_200,  // impressions
      9_800,   // reach
      212,     // clicks
      {
        linkClicks: 195,
        outboundClicks: 195,
        landingPageViews: 105,
        addToCart: 4,
        initiateCheckout: 2,
      }
    ),
    previousMetrics: calculateMetricsFromRaw(
      80_000,
      0,
      0,
      4_200,
      3_900,
      80,
      {
        linkClicks: 72,
        outboundClicks: 72,
        landingPageViews: 40,
        addToCart: 1,
        initiateCheckout: 0,
      }
    ),
    adSets: [
      {
        id: 'adset_03_a',
        campaignId: 'camp_03',
        name: 'AdSet 01 - Interest Productivity & Habit Tracker',
        targetingSummary: 'Indonesia, Interest: Notion, Time management, Personal development',
        dailyBudget: 60_000,
        status: 'PROBLEM',
        metrics: calculateMetricsFromRaw(150_000, 0, 0, 7_600, 6_800, 152),
        previousMetrics: calculateMetricsFromRaw(50_000, 0, 0, 2_600, 2_400, 52),
        ads: [
          {
            id: 'ad_03_a_1',
            adSetId: 'adset_03_a',
            campaignId: 'camp_03',
            name: 'Creative Video 05 - Estetik Notion Dashboard Tour',
            format: 'Video',
            hookText: '"Atur seluruh hidup, keuangan, dan kerjaan dalam 1 halaman Notion."',
            status: 'PROBLEM',
            metrics: calculateMetricsFromRaw(90_000, 0, 0, 4_500, 4_100, 95),
            previousMetrics: calculateMetricsFromRaw(30_000, 0, 0, 1_600, 1_500, 32),
          },
          {
            id: 'ad_03_a_2',
            adSetId: 'adset_03_a',
            campaignId: 'camp_03',
            name: 'Creative Image 05 - Mockup iPad & Laptop',
            format: 'Image',
            hookText: 'All-in-one Life OS Template siap pakai',
            status: 'PROBLEM',
            metrics: calculateMetricsFromRaw(45_000, 0, 0, 2_200, 1_900, 42),
            previousMetrics: calculateMetricsFromRaw(20_000, 0, 0, 1_000, 900, 20),
          },
          {
            id: 'ad_03_a_3',
            adSetId: 'adset_03_a',
            campaignId: 'camp_03',
            name: 'Creative Carousel 04 - Fitur Finance & Goal Tracker',
            format: 'Carousel',
            hookText: 'Slide 1: Catat pemasukan dan pengeluaran otomatis',
            status: 'NOT_ENOUGH_DATA',
            metrics: calculateMetricsFromRaw(15_000, 0, 0, 900, 800, 15),
            previousMetrics: calculateMetricsFromRaw(0, 0, 0, 0, 0, 0),
          },
        ],
      },
      {
        id: 'adset_03_b',
        campaignId: 'camp_03',
        name: 'AdSet 02 - Mahasiswa & Early Career Workers',
        targetingSummary: 'Indonesia, Umur 18-26, Pelajar & Pekerja Baru',
        dailyBudget: 40_000,
        status: 'PROBLEM',
        metrics: calculateMetricsFromRaw(70_000, 0, 0, 3_600, 3_100, 60),
        previousMetrics: calculateMetricsFromRaw(30_000, 0, 0, 1_600, 1_500, 28),
        ads: [
          {
            id: 'ad_03_b_1',
            adSetId: 'adset_03_b',
            campaignId: 'camp_03',
            name: 'Creative Video 06 - Kuliah vs Skripsi Organizer',
            format: 'Video',
            hookText: '"Template Notion ini bikin skripsi kelar 2 bulan lebih cepat."',
            status: 'PROBLEM',
            metrics: calculateMetricsFromRaw(45_000, 0, 0, 2_300, 2_000, 38),
            previousMetrics: calculateMetricsFromRaw(20_000, 0, 0, 1_000, 950, 18),
          },
          {
            id: 'ad_03_b_2',
            adSetId: 'adset_03_b',
            campaignId: 'camp_03',
            name: 'Creative Image 06 - Simple Clean Daily Planner',
            format: 'Image',
            hookText: 'Rencanakan hari Anda dalam 3 menit tiap pagi',
            status: 'NOT_ENOUGH_DATA',
            metrics: calculateMetricsFromRaw(15_000, 0, 0, 800, 700, 14),
            previousMetrics: calculateMetricsFromRaw(10_000, 0, 0, 600, 550, 10),
          },
          {
            id: 'ad_03_b_3',
            adSetId: 'adset_03_b',
            campaignId: 'camp_03',
            name: 'Creative Carousel 05 - 7 Hari Membangun Disiplin Diri',
            format: 'Carousel',
            hookText: 'Metode atomic habit dalam dashboard Notion terintegrasi',
            status: 'NOT_ENOUGH_DATA',
            metrics: calculateMetricsFromRaw(10_000, 0, 0, 500, 420, 8),
            previousMetrics: calculateMetricsFromRaw(0, 0, 0, 0, 0, 0),
          },
        ],
      },
    ],
  },
];

export const INITIAL_ACCOUNT: MetaAdAccount = {
  id: 'act_892182910381',
  name: 'ALCO Digital Academy (ID)',
  currency: 'IDR',
  timezone: 'Asia/Jakarta',
  status: 'ACTIVE',
  campaigns: INITIAL_CAMPAIGNS,
};
