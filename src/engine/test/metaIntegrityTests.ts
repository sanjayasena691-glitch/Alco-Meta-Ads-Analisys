import { 
  mapMetaInsightsToPerformanceMetrics, 
  assembleCampaignHierarchy,
  createUnknownPerformanceMetrics,
  parseNullableNumber 
} from '../../services/metaAds/metaAdsMapper';
import { calculatePercentChange } from '../../utils/formatters';
import { PerformanceMetrics, Campaign } from '../../types';

export interface IntegrityTestCaseResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export interface IntegrityTestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  timestamp: string;
  results: IntegrityTestCaseResult[];
}

/**
 * Runs the deterministic 12-scenario Meta Data Integrity Audit Test Suite.
 * Validates the core principle: UNKNOWN ≠ ZERO ≠ DEFAULT.
 */
export function runMetaDataIntegrityTests(): IntegrityTestSuiteResult {
  const results: IntegrityTestCaseResult[] = [];

  // Scenario 1: No Purchase (Spend > 0, purchases = 0) -> CPA must be null, never default to spend!
  {
    const input = {
      spend: '500000',
      impressions: '10000',
      reach: '5000',
      clicks: '200',
      actions: [{ action_type: 'link_click', value: '180' }],
    };
    const m = mapMetaInsightsToPerformanceMetrics(input as any);
    const passed = m.purchases === null && m.cpa === null && m.spend === 500000;
    results.push({
      id: 'SCENARIO_1_NO_PURCHASE',
      name: '1. No Purchase (Zero CPA Fabrication Protection)',
      description: 'Spend > 0 tetapi tidak ada pembelian. CPA harus null (bukan default ke nilai spend).',
      passed,
      expected: 'purchases: null, cpa: null, spend: 500000',
      actual: `purchases: ${m.purchases}, cpa: ${m.cpa}, spend: ${m.spend}`,
    });
  }

  // Scenario 2: Missing Purchase Event (Actions array does NOT contain 'purchase')
  {
    const input = {
      spend: '300000',
      impressions: '5000',
      reach: '3000',
      clicks: '100',
      actions: [{ action_type: 'landing_page_view', value: '80' }],
    };
    const m = mapMetaInsightsToPerformanceMetrics(input as any);
    const passed = m.purchases === null && m.cpa === null;
    results.push({
      id: 'SCENARIO_2_MISSING_PURCHASE_EVENT',
      name: '2. Missing Purchase Event in Actions',
      description: 'Actions tidak mengandung event purchase. purchases & cpa harus null (bukan 0 atau spend).',
      passed,
      expected: 'purchases: null, cpa: null',
      actual: `purchases: ${m.purchases}, cpa: ${m.cpa}`,
    });
  }

  // Scenario 3: Zero Spend (Spend = 0, impressions = 0)
  {
    const input = {
      spend: '0',
      impressions: '0',
      reach: '0',
      clicks: '0',
      actions: [],
    };
    const m = mapMetaInsightsToPerformanceMetrics(input as any);
    const passed = m.spend === 0 && m.impressions === 0 && m.cpa === null && m.ctr === null && m.cpc === null && m.cpm === null;
    results.push({
      id: 'SCENARIO_3_ZERO_SPEND',
      name: '3. Zero Spend & Zero Impressions Safety',
      description: 'Spend 0 dan impresi 0 tidak boleh menghasilkan division-by-zero atau default artificial.',
      passed,
      expected: 'spend: 0, impressions: 0, cpa: null, ctr: null, cpc: null, cpm: null',
      actual: `spend: ${m.spend}, impressions: ${m.impressions}, cpa: ${m.cpa}, ctr: ${m.ctr}, cpc: ${m.cpc}, cpm: ${m.cpm}`,
    });
  }

  // Scenario 4: No Insight (undefined / null insight response)
  {
    const m = mapMetaInsightsToPerformanceMetrics(undefined);
    const passed = m.spend === null && m.impressions === null && m.cpa === null && m.frequency === null && m.dataAvailability === 'UNAVAILABLE';
    results.push({
      id: 'SCENARIO_4_NO_INSIGHT',
      name: '4. Missing Insight Response',
      description: 'Ketika insight tidak ada / undefined, seluruh metrik harus null dengan availability UNAVAILABLE.',
      passed,
      expected: 'all metrics null, dataAvailability: UNAVAILABLE',
      actual: `spend: ${m.spend}, impressions: ${m.impressions}, freq: ${m.frequency}, dataAvailability: ${m.dataAvailability}`,
    });
  }

  // Scenario 5: Missing Reach (impressions = 1000, reach missing / null)
  {
    const input = {
      spend: '100000',
      impressions: '1000',
      reach: null,
    };
    const m = mapMetaInsightsToPerformanceMetrics(input as any);
    const passed = m.impressions === 1000 && m.reach === null && m.frequency === null;
    results.push({
      id: 'SCENARIO_5_MISSING_REACH',
      name: '5. Missing Reach Frequency Protection',
      description: 'Ketika reach null atau tidak tersedia, frequency harus null (dilarang fallback ke 1.0).',
      passed,
      expected: 'reach: null, frequency: null',
      actual: `reach: ${m.reach}, frequency: ${m.frequency}`,
    });
  }

  // Scenario 6: Lifetime Budget (Campaign has lifetime_budget)
  {
    const hierarchy = assembleCampaignHierarchy({
      rawCampaigns: [{ id: 'c1', name: 'Ramadhan Promo', lifetime_budget: '50000000', daily_budget: null as any }],
      rawAdSets: [],
      rawAds: [],
      currentCampaignInsights: new Map(),
      previousCampaignInsights: new Map(),
      currentAdSetInsights: new Map(),
      previousAdSetInsights: new Map(),
      currentAdInsights: new Map(),
      previousAdInsights: new Map(),
    });
    const camp = hierarchy[0];
    const passed = camp?.lifetimeBudget === 500000 && camp?.dailyBudget === null && camp?.budgetType === 'LIFETIME';
    results.push({
      id: 'SCENARIO_6_LIFETIME_BUDGET',
      name: '6. Lifetime Budget Distinction',
      description: 'Campaign dengan lifetime_budget dipetakan ke lifetimeBudget, dailyBudget null, budgetType LIFETIME.',
      passed,
      expected: 'lifetimeBudget: 500000, dailyBudget: null, budgetType: LIFETIME',
      actual: `lifetimeBudget: ${camp?.lifetimeBudget}, dailyBudget: ${camp?.dailyBudget}, budgetType: ${camp?.budgetType}`,
    });
  }

  // Scenario 7: No Budget (Budget missing)
  {
    const hierarchy = assembleCampaignHierarchy({
      rawCampaigns: [{ id: 'c2', name: 'Brand Awareness', lifetime_budget: null as any, daily_budget: null as any }],
      rawAdSets: [],
      rawAds: [],
      currentCampaignInsights: new Map(),
      previousCampaignInsights: new Map(),
      currentAdSetInsights: new Map(),
      previousAdSetInsights: new Map(),
      currentAdInsights: new Map(),
      previousAdInsights: new Map(),
    });
    const camp = hierarchy[0];
    const passed = camp?.dailyBudget === null && camp?.lifetimeBudget === null && camp?.budgetType === 'UNKNOWN';
    results.push({
      id: 'SCENARIO_7_NO_BUDGET',
      name: '7. Missing Budget Zero-Fabrication',
      description: 'Budget tidak tersedia dipetakan ke null (dilarang fallback ke Rp150.000).',
      passed,
      expected: 'dailyBudget: null, lifetimeBudget: null, budgetType: UNKNOWN',
      actual: `dailyBudget: ${camp?.dailyBudget}, lifetimeBudget: ${camp?.lifetimeBudget}, budgetType: ${camp?.budgetType}`,
    });
  }

  // Scenario 8: Missing Revenue (Purchase exists, but action_values missing purchase)
  {
    const input = {
      spend: '200000',
      actions: [{ action_type: 'purchase', value: '2' }],
      action_values: [],
    };
    const m = mapMetaInsightsToPerformanceMetrics(input as any);
    const passed = m.purchases === 2 && m.revenue === null && m.roas === null && m.cpa === 100000;
    results.push({
      id: 'SCENARIO_8_MISSING_REVENUE',
      name: '8. Missing Revenue Action Value',
      description: 'Ada 2 order tapi nilai revenue tidak tercatat oleh pixel. revenue & roas harus null.',
      passed,
      expected: 'purchases: 2, revenue: null, roas: null, cpa: 100000',
      actual: `purchases: ${m.purchases}, revenue: ${m.revenue}, roas: ${m.roas}, cpa: ${m.cpa}`,
    });
  }

  // Scenario 9: Real Zero Revenue (Purchase = 1, Revenue = 0)
  {
    const input = {
      spend: '150000',
      actions: [{ action_type: 'purchase', value: '1' }],
      action_values: [{ action_type: 'purchase', value: '0' }],
    };
    const m = mapMetaInsightsToPerformanceMetrics(input as any);
    const passed = m.purchases === 1 && m.revenue === 0 && m.roas === 0;
    results.push({
      id: 'SCENARIO_9_REAL_ZERO_REVENUE',
      name: '9. Explicit Zero Revenue Distinction',
      description: 'Nilai 0 nyata dari Meta action_values harus dipetakan ke revenue: 0 dan roas: 0 (bukan null).',
      passed,
      expected: 'purchases: 1, revenue: 0, roas: 0',
      actual: `purchases: ${m.purchases}, revenue: ${m.revenue}, roas: ${m.roas}`,
    });
  }

  // Scenario 10: Missing Previous Period
  {
    const curr = 250000;
    const prev = null;
    const change = calculatePercentChange(curr, prev);
    const passed = change === null;
    results.push({
      id: 'SCENARIO_10_MISSING_PREVIOUS_PERIOD',
      name: '10. Missing Comparison Period Safety',
      description: 'Ketika data periode pembanding null, percentChange harus null (tidak boleh crash atau menghasilkan +100%).',
      passed,
      expected: 'percentChange: null',
      actual: `percentChange: ${change}`,
    });
  }

  // Scenario 11: Invalid Number / Non-numeric String
  {
    const input = {
      spend: 'invalid_data',
      impressions: 'NaN',
      reach: 'undefined',
      clicks: null,
    };
    const m = mapMetaInsightsToPerformanceMetrics(input as any);
    const passed = m.spend === null && m.impressions === null && m.reach === null && m.clicks === null;
    results.push({
      id: 'SCENARIO_11_INVALID_NUMBER',
      name: '11. Invalid Number / Non-numeric String Sanitization',
      description: 'Nilai string korup/invalid diparsing menjadi null tanpa runtime exception.',
      passed,
      expected: 'spend: null, impressions: null, reach: null, clicks: null',
      actual: `spend: ${m.spend}, impressions: ${m.impressions}, reach: ${m.reach}, clicks: ${m.clicks}`,
    });
  }

  // Scenario 12: Unknown Creative Format
  {
    const hierarchy = assembleCampaignHierarchy({
      rawCampaigns: [{ id: 'c3', name: 'General Campaign' }],
      rawAdSets: [{ id: 'as1', campaign_id: 'c3', name: 'Broad AdSet' }],
      rawAds: [{ id: 'ad1', campaign_id: 'c3', adset_id: 'as1', name: 'Ad One', creative: { id: 'cr1', body: 'Promo Diskon' } }],
      currentCampaignInsights: new Map(),
      previousCampaignInsights: new Map(),
      currentAdSetInsights: new Map(),
      previousAdSetInsights: new Map(),
      currentAdInsights: new Map(),
      previousAdInsights: new Map(),
    });
    const ad = hierarchy[0]?.adSets[0]?.ads[0];
    const passed = ad?.format === 'UNKNOWN';
    results.push({
      id: 'SCENARIO_12_UNKNOWN_CREATIVE_FORMAT',
      name: '12. Unknown Creative Format Zero-Fabrication',
      description: 'Materi iklan tanpa metadata video/image yang pasti diklasifikasikan sebagai UNKNOWN.',
      passed,
      expected: 'format: UNKNOWN',
      actual: `format: ${ad?.format}`,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    timestamp: new Date().toISOString(),
    results,
  };
}
