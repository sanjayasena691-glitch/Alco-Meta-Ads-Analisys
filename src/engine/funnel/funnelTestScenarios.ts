import { 
  PerformanceMetrics, 
  BusinessTargets, 
  LandingPageBehaviorMetrics, 
  FunnelBottleneck 
} from '../../types';
import { detectPrimaryBottleneck } from './funnelDiagnosisEngine';
import { evaluateLandingPageHealth } from '../rules/landingPage/landingPageRuleEvaluator';

export interface FunnelMockScenario {
  id: string;
  name: string;
  description: string;
  expectedBottleneck: FunnelBottleneck;
  metaMetrics: PerformanceMetrics;
  previousMetrics?: PerformanceMetrics;
  lpMetrics?: LandingPageBehaviorMetrics;
  targets: BusinessTargets;
}

const DEFAULT_TEST_TARGETS: BusinessTargets = {
  productName: 'Produk Uji',
  dailyBudget: 500000,
  targetCpa: 65000,
  breakEvenCpa: 110000,
  targetRoas: 2.8,
  minAcceptableRoas: 1.8,
  productPrice: 249000,
  targetCtr: 1.8,
  targetCpc: 2500,
};

export const FUNNEL_TEST_SCENARIOS: FunnelMockScenario[] = [
  // Scenario A: Healthy
  {
    id: 'SCENARIO_A',
    name: 'Scenario A — Healthy Funnel',
    description: 'Seluruh tahap berjalan harmonis: CTR sehat, LP View Rate tinggi, scroll bagus, checkout lancar, ROAS 3.4x.',
    expectedBottleneck: 'HEALTHY',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 2500000,
      revenue: 8500000,
      purchases: 42,
      impressions: 65000,
      reach: 52000,
      clicks: 1450,
      linkClicks: 1400,
      frequency: 1.25,
      roas: 3.4,
      cpa: 59523,
      ctr: 2.23,
      cpc: 1724,
      cpm: 38461,
      landingPageViews: 1220,
      initiateCheckout: 110,
    },
    lpMetrics: {
      sessions: 1220,
      avgScrollDepth: 62,
      avgEngagementTime: 48,
      rageClicks: 4,
      deadClicks: 12,
      excessiveScrolls: 3,
      quickBacks: 95,
      scriptErrors: 0,
      ctaClicks: 140,
      checkoutStarts: 110,
      purchases: 42,
    },
  },

  // Scenario B: Creative Fatigue (Multi-signal: freq up, CTR down, CPC up, performance worsening)
  {
    id: 'SCENARIO_B',
    name: 'Scenario B — Creative Fatigue',
    description: 'Frekuensi tinggi (2.9x), CTR anjlok (-40%), CPC naik, audiens jenuh.',
    expectedBottleneck: 'CREATIVE',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 3800000,
      revenue: 4500000,
      purchases: 22,
      impressions: 78000,
      reach: 26800,
      clicks: 720,
      linkClicks: 680,
      frequency: 2.91,
      roas: 1.18,
      cpa: 172727,
      ctr: 0.92,
      cpc: 5277,
      cpm: 48717,
      landingPageViews: 580,
      initiateCheckout: 35,
    },
    previousMetrics: {
      spend: 3500000,
      revenue: 9800000,
      purchases: 54,
      impressions: 80000,
      reach: 58000,
      clicks: 1600,
      linkClicks: 1520,
      frequency: 1.38,
      roas: 2.8,
      cpa: 64814,
      ctr: 2.0,
      cpc: 2187,
      cpm: 43750,
      landingPageViews: 1350,
    },
    lpMetrics: {
      sessions: 580,
      avgScrollDepth: 55,
      avgEngagementTime: 42,
      rageClicks: 2,
      deadClicks: 8,
      excessiveScrolls: 2,
      quickBacks: 45,
      scriptErrors: 0,
      ctaClicks: 48,
      checkoutStarts: 35,
      purchases: 22,
    },
  },

  // Scenario C: LP Content Problem (Message Mismatch / High Quickback / Low Scroll)
  {
    id: 'SCENARIO_C',
    name: 'Scenario C — LP Content Problem',
    description: 'CTR Meta tinggi (2.4%), traffic masuk, namun 42% visitor Quick Back dan rata-rata scroll hanya 28%.',
    expectedBottleneck: 'LANDING_PAGE_CONTENT',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 2100000,
      revenue: 1245000,
      purchases: 5,
      impressions: 45000,
      reach: 38000,
      clicks: 1100,
      linkClicks: 1080,
      frequency: 1.18,
      roas: 0.59,
      cpa: 420000,
      ctr: 2.44,
      cpc: 1909,
      cpm: 46666,
      landingPageViews: 860,
      initiateCheckout: 12,
    },
    lpMetrics: {
      sessions: 860,
      avgScrollDepth: 28,
      avgEngagementTime: 14,
      rageClicks: 5,
      deadClicks: 18,
      excessiveScrolls: 4,
      quickBacks: 360,
      scriptErrors: 0,
      ctaClicks: 18,
      checkoutStarts: 12,
      purchases: 5,
    },
  },

  // Scenario D: Technical LP Problem (LP View Rate leak / Script Error)
  {
    id: 'SCENARIO_D',
    name: 'Scenario D — Technical LP Problem',
    description: 'Traffic Meta 1.200 klik, tapi View Rate hanya 52% (loading crash) dan 14 JavaScript errors.',
    expectedBottleneck: 'LANDING_PAGE_TECHNICAL',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 2800000,
      revenue: 1494000,
      purchases: 6,
      impressions: 58000,
      reach: 49000,
      clicks: 1250,
      linkClicks: 1200,
      frequency: 1.18,
      roas: 0.53,
      cpa: 466666,
      ctr: 2.15,
      cpc: 2240,
      cpm: 48275,
      landingPageViews: 620,
      initiateCheckout: 15,
    },
    lpMetrics: {
      sessions: 620,
      avgScrollDepth: 48,
      avgEngagementTime: 32,
      rageClicks: 48,
      deadClicks: 22,
      excessiveScrolls: 6,
      quickBacks: 90,
      scriptErrors: 14,
      ctaClicks: 22,
      checkoutStarts: 15,
      purchases: 6,
    },
  },

  // Scenario E: Checkout Problem (Checkout dropoff / Payment failure)
  {
    id: 'SCENARIO_E',
    name: 'Scenario E — Checkout Problem',
    description: 'Ads bagus, LP scroll bagus (60%), 85 orang masuk form checkout tapi hanya 4 yang berhasil bayar (4.7%).',
    expectedBottleneck: 'CHECKOUT',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 2900000,
      revenue: 996000,
      purchases: 4,
      impressions: 55000,
      reach: 47000,
      clicks: 1150,
      linkClicks: 1100,
      frequency: 1.17,
      roas: 0.34,
      cpa: 725000,
      ctr: 2.09,
      cpc: 2521,
      cpm: 52727,
      landingPageViews: 920,
      initiateCheckout: 85,
    },
    lpMetrics: {
      sessions: 920,
      avgScrollDepth: 60,
      avgEngagementTime: 45,
      rageClicks: 3,
      deadClicks: 12,
      excessiveScrolls: 2,
      quickBacks: 85,
      scriptErrors: 1,
      ctaClicks: 95,
      checkoutStarts: 85,
      purchases: 4,
    },
  },

  // Scenario F: Not Enough Data
  {
    id: 'SCENARIO_F',
    name: 'Scenario F — Not Enough Data',
    description: 'Spend baru Rp35.000 (< 0.7x CPA), 420 impressions, 0 purchase.',
    expectedBottleneck: 'INSUFFICIENT_DATA',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 35000,
      revenue: 0,
      purchases: 0,
      impressions: 420,
      reach: 380,
      clicks: 8,
      linkClicks: 8,
      frequency: 1.1,
      roas: 0,
      cpa: 0,
      ctr: 1.9,
      cpc: 4375,
      cpm: 83333,
      landingPageViews: 6,
      initiateCheckout: 0,
    },
    lpMetrics: {
      sessions: 6,
      avgScrollDepth: 40,
      avgEngagementTime: 25,
      rageClicks: 0,
      deadClicks: 0,
      excessiveScrolls: 0,
      quickBacks: 1,
      scriptErrors: 0,
      ctaClicks: 0,
      checkoutStarts: 0,
      purchases: 0,
    },
  },

  // Scenario G: Mixed Problem (Ads CTR somewhat low, but LP loading/script crash is severe)
  {
    id: 'SCENARIO_G',
    name: 'Scenario G — Mixed Problem',
    description: 'CTR turun ke 1.1%, namun di saat yang sama LP View Rate bocor parah (48%) dengan 12 script error.',
    expectedBottleneck: 'LANDING_PAGE_TECHNICAL',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 2400000,
      revenue: 747000,
      purchases: 3,
      impressions: 60000,
      reach: 51000,
      clicks: 700,
      linkClicks: 660,
      frequency: 1.17,
      roas: 0.31,
      cpa: 800000,
      ctr: 1.1,
      cpc: 3428,
      cpm: 40000,
      landingPageViews: 320,
      initiateCheckout: 8,
    },
    lpMetrics: {
      sessions: 320,
      avgScrollDepth: 35,
      avgEngagementTime: 20,
      rageClicks: 26,
      deadClicks: 15,
      excessiveScrolls: 4,
      quickBacks: 110,
      scriptErrors: 12,
      ctaClicks: 12,
      checkoutStarts: 8,
      purchases: 3,
    },
  },

  // Scenario H: High Frequency But Stable Performance (NOT creative fatigue)
  {
    id: 'SCENARIO_H',
    name: 'Scenario H — High Frequency But Stable Performance',
    description: 'Frekuensi tinggi 2.85x pada retargeting/niche audience, namun CTR tetap 2.3%, CPC murah Rp1.750, CPA Rp58.000, dan ROAS 3.2x (Sehat & Menguntungkan).',
    expectedBottleneck: 'HEALTHY',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 2900000,
      revenue: 9280000,
      purchases: 50,
      impressions: 72000,
      reach: 25200,
      clicks: 1650,
      linkClicks: 1600,
      frequency: 2.85,
      roas: 3.2,
      cpa: 58000,
      ctr: 2.29,
      cpc: 1757,
      cpm: 40277,
      landingPageViews: 1400,
      initiateCheckout: 120,
    },
    lpMetrics: {
      sessions: 1400,
      avgScrollDepth: 65,
      avgEngagementTime: 50,
      rageClicks: 3,
      deadClicks: 10,
      excessiveScrolls: 2,
      quickBacks: 90,
      scriptErrors: 0,
      ctaClicks: 160,
      checkoutStarts: 120,
      purchases: 50,
    },
  },

  // Scenario I: CPA Above Target But Below Break-even (Profitable Optimization)
  {
    id: 'SCENARIO_I',
    name: 'Scenario I — CPA Above Target But Below Break-even',
    description: 'CPA Rp87.500 (di atas target Rp65.000 namun di bawah break-even Rp110.000). Masih profit kotor, butuh optimasi bukan alarm panik rugi.',
    expectedBottleneck: 'MONITOR',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 2800000,
      revenue: 5976000,
      purchases: 32,
      impressions: 62000,
      reach: 48000,
      clicks: 1100,
      linkClicks: 1050,
      frequency: 1.29,
      roas: 2.13,
      cpa: 87500,
      ctr: 1.77,
      cpc: 2545,
      cpm: 45161,
      landingPageViews: 900,
      initiateCheckout: 65,
    },
    lpMetrics: {
      sessions: 900,
      avgScrollDepth: 52,
      avgEngagementTime: 38,
      rageClicks: 5,
      deadClicks: 14,
      excessiveScrolls: 3,
      quickBacks: 140,
      scriptErrors: 0,
      ctaClicks: 80,
      checkoutStarts: 65,
      purchases: 32,
    },
  },

  // Scenario J: Missing LP Metrics (Clarity / Pixel unintegrated)
  {
    id: 'SCENARIO_J',
    name: 'Scenario J — Missing Landing Page Telemetry',
    description: 'Meta Ads mengeluarkan spend Rp2.400.000 dengan 2 purchases (CPA Rp1.200.000 > break-even), namun belum ada data telemetri Clarity sama sekali. Sistem tidak mengarang masalah LP.',
    expectedBottleneck: 'UNKNOWN',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 2400000,
      revenue: 498000,
      purchases: 2,
      impressions: 48000,
      reach: 40000,
      clicks: 850,
      linkClicks: 820,
      frequency: 1.2,
      roas: 0.2,
      cpa: 1200000,
      ctr: 1.77,
      cpc: 2823,
      cpm: 50000,
    },
    lpMetrics: undefined,
  },

  // Scenario K: Missing LP View Metric (linkClicks present, landingPageViews undefined)
  {
    id: 'SCENARIO_K',
    name: 'Scenario K — Missing LP View Metric',
    description: 'Link Clicks = 100, namun landingPageViews tidak ada di Meta dan Clarity belum terpasang. Sistem tidak mengarang nilai LP Views = 85.',
    expectedBottleneck: 'UNKNOWN',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 850000,
      revenue: 150000,
      purchases: 1,
      impressions: 18000,
      reach: 15000,
      clicks: 100,
      linkClicks: 100,
      frequency: 1.2,
      roas: 0.18,
      cpa: 850000,
      ctr: 0.83,
      cpc: 8500,
      cpm: 47222,
    },
    lpMetrics: undefined,
  },

  // Scenario L: Actual Zero LP View (Critical 100% Drop-off / Blank Screen)
  {
    id: 'SCENARIO_L',
    name: 'Scenario L — Actual Zero LP Views',
    description: 'Link Clicks = 100, namun landingPageViews dilaporkan PERSIS 0 (White Screen of Death / domain error). Sistem mendeteksi kebocoran teknis 100%.',
    expectedBottleneck: 'LANDING_PAGE_TECHNICAL',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 600000,
      revenue: 0,
      purchases: 0,
      impressions: 12000,
      reach: 10000,
      clicks: 100,
      linkClicks: 100,
      frequency: 1.2,
      roas: 0,
      cpa: 0,
      ctr: 0.83,
      cpc: 6000,
      cpm: 50000,
      landingPageViews: 0,
    },
    lpMetrics: {
      sessions: 0,
      avgScrollDepth: 0,
      avgEngagementTime: 0,
      rageClicks: 0,
      deadClicks: 0,
      excessiveScrolls: 0,
      quickBacks: 0,
      scriptErrors: 0,
    },
  },

  // Scenario M: Missing Checkout Tracking (Landing Page active, checkout event unintegrated)
  {
    id: 'SCENARIO_M',
    name: 'Scenario M — Missing Checkout Tracking',
    description: 'Landing page terhubung dengan 750 sesi, namun event Initiate Checkout belum dikonfigurasi. Sistem tidak mengarang checkout = 52.',
    expectedBottleneck: 'MONITOR',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 2000000,
      revenue: 3900000,
      purchases: 26,
      impressions: 45000,
      reach: 38000,
      clicks: 900,
      linkClicks: 880,
      frequency: 1.18,
      roas: 1.95,
      cpa: 76923,
      ctr: 2.0,
      cpc: 2272,
      cpm: 44444,
      landingPageViews: 750,
    },
    lpMetrics: {
      sessions: 750,
      avgScrollDepth: 62,
      avgEngagementTime: 45,
      rageClicks: 4,
      deadClicks: 12,
      excessiveScrolls: 2,
      quickBacks: 95,
      scriptErrors: 0,
      ctaClicks: 90,
    },
  },

  // Scenario N: Missing CTA Event Tracking
  {
    id: 'SCENARIO_N',
    name: 'Scenario N — Missing CTA Event Tracking',
    description: 'Sesi LP 680 dan Checkout 55 terhubung, namun event klik CTA spesifik tidak di-tag. Sistem tidak membunyikan alarm palsu CTA.',
    expectedBottleneck: 'HEALTHY',
    targets: DEFAULT_TEST_TARGETS,
    metaMetrics: {
      spend: 1800000,
      revenue: 4500000,
      purchases: 30,
      impressions: 42000,
      reach: 36000,
      clicks: 800,
      linkClicks: 780,
      frequency: 1.16,
      roas: 2.5,
      cpa: 60000,
      ctr: 1.9,
      cpc: 2307,
      cpm: 42857,
      landingPageViews: 680,
      initiateCheckout: 55,
    },
    lpMetrics: {
      sessions: 680,
      avgScrollDepth: 65,
      avgEngagementTime: 50,
      rageClicks: 2,
      deadClicks: 8,
      excessiveScrolls: 1,
      quickBacks: 80,
      scriptErrors: 0,
      checkoutStarts: 55,
      purchases: 30,
    },
  },
];

export interface ScenarioTestResult {
  scenarioId: string;
  name: string;
  expected: FunnelBottleneck;
  actual: FunnelBottleneck;
  passed: boolean;
  confidence: string;
  primaryBottleneck: string;
  secondaryIssue: string | null;
  evidence: string[];
}

/**
 * Runs all deterministic scenario tests and confirms logic consistency
 */
export function runFunnelScenarioTests(): {
  allPassed: boolean;
  total: number;
  passedCount: number;
  results: ScenarioTestResult[];
} {
  const results: ScenarioTestResult[] = FUNNEL_TEST_SCENARIOS.map((sc) => {
    const lpEval = sc.lpMetrics ? evaluateLandingPageHealth(sc.lpMetrics, sc.name) : undefined;
    const diagnosis = detectPrimaryBottleneck(
      sc.metaMetrics,
      sc.targets,
      sc.lpMetrics,
      lpEval,
      sc.previousMetrics
    );

    const passed = diagnosis.primaryBottleneck === sc.expectedBottleneck;

    return {
      scenarioId: sc.id,
      name: sc.name,
      expected: sc.expectedBottleneck,
      actual: diagnosis.primaryBottleneck,
      passed,
      confidence: diagnosis.confidence,
      primaryBottleneck: diagnosis.primaryBottleneck,
      secondaryIssue: diagnosis.secondaryIssue,
      evidence: diagnosis.evidence,
    };
  });

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = passedCount === results.length;

  return {
    allPassed,
    total: results.length,
    passedCount,
    results,
  };
}
