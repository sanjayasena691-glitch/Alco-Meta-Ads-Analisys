import { RULES, RuleContext } from '../rules/ruleDefinitions';
import { evaluateEntity } from '../rules/ruleEvaluator';
import { PerformanceMetrics, BusinessTargets } from '../../types';
import { IntegrityTestCaseResult, IntegrityTestSuiteResult } from './metaIntegrityTests';

const DEFAULT_TARGETS: BusinessTargets = {
  productName: 'Produk Uji ALCO',
  productPrice: 150000,
  targetCpa: 35000,
  breakEvenCpa: 50000,
  targetRoas: 3.0,
  dailyBudget: 500000,
  targetCtr: 1.8,
};

function createMetrics(partial: Partial<PerformanceMetrics>): PerformanceMetrics {
  return {
    spend: null,
    revenue: null,
    purchases: null,
    impressions: null,
    reach: null,
    clicks: null,
    frequency: null,
    roas: null,
    cpa: null,
    ctr: null,
    cpc: null,
    cpm: null,
    dataAvailability: 'AVAILABLE',
    ...partial,
  };
}

/**
 * Runs the deterministic Rule Engine Data-Integrity Test Suite (Tests A - H).
 * Verifies that UNKNOWN (null) is never converted to ZERO or false problem signals.
 */
export function runRuleIntegrityTests(): IntegrityTestSuiteResult {
  const results: IntegrityTestCaseResult[] = [];

  // Rule Test A: Spend = 500,000, Purchases = 0 -> HIGH_SPEND_NO_PURCHASE should trigger
  {
    const current = createMetrics({
      spend: 500000,
      purchases: 0,
      impressions: 5000,
      clicks: 120,
      dataAvailability: 'AVAILABLE',
    });
    const previous = createMetrics({ spend: 300000, purchases: 5 });
    const ctx: RuleContext = {
      entityName: 'Test Campaign A',
      entityType: 'campaign',
      current,
      previous,
      targets: DEFAULT_TARGETS,
    };

    const rule = RULES.find((r) => r.id === 'HIGH_SPEND_NO_PURCHASE');
    const signal = rule?.evaluate(ctx);
    const passed = signal !== null && signal !== undefined && signal.type === 'HIGH_SPEND_NO_PURCHASE';

    results.push({
      id: 'RULE_TEST_A_HIGH_SPEND_ZERO_PURCHASE',
      name: 'Rule Test A: Spend 500k with Known 0 Purchase',
      description: 'Spend 500.000 dengan verified 0 purchase harus men-trigger HIGH_SPEND_NO_PURCHASE.',
      passed,
      expected: 'Signal HIGH_SPEND_NO_PURCHASE triggered',
      actual: signal ? `Signal ${signal.type} triggered (${signal.title})` : 'No signal triggered',
    });
  }

  // Rule Test B: Spend = 500,000, Purchases = null -> HIGH_SPEND_NO_PURCHASE MUST NOT trigger!
  {
    const current = createMetrics({
      spend: 500000,
      purchases: null, // Unknown/untracked conversion
      impressions: 5000,
      clicks: 120,
      dataAvailability: 'AVAILABLE',
    });
    const previous = createMetrics({ spend: 300000 });
    const ctx: RuleContext = {
      entityName: 'Test Campaign B',
      entityType: 'campaign',
      current,
      previous,
      targets: DEFAULT_TARGETS,
    };

    const rule = RULES.find((r) => r.id === 'HIGH_SPEND_NO_PURCHASE');
    const signal = rule?.evaluate(ctx);
    const passed = signal === null;

    results.push({
      id: 'RULE_TEST_B_HIGH_SPEND_NULL_PURCHASE',
      name: 'Rule Test B: Spend 500k with Unknown Purchase (null)',
      description: 'Spend 500.000 dengan purchases null (tidak tersedia) TIDAK BOLEH men-trigger HIGH_SPEND_NO_PURCHASE.',
      passed,
      expected: 'Signal HIGH_SPEND_NO_PURCHASE is null (no false accusation of zero purchases)',
      actual: signal ? `Unexpected signal: ${signal.type}` : 'Signal is null (Correctly Protected)',
    });
  }

  // Rule Test C: Spend = 0, dataAvailability = AVAILABLE -> CAMPAIGN_NOT_SPENDING can trigger
  {
    const current = createMetrics({
      spend: 0,
      impressions: 0,
      dataAvailability: 'AVAILABLE',
    });
    const previous = createMetrics({ spend: 0, impressions: 0 });
    const ctx: RuleContext = {
      entityName: 'Test Campaign C',
      entityType: 'campaign',
      current,
      previous,
      targets: DEFAULT_TARGETS,
    };

    const rule = RULES.find((r) => r.id === 'CAMPAIGN_NOT_SPENDING');
    const signal = rule?.evaluate(ctx);
    const passed = signal !== null && signal !== undefined && signal.type === 'CAMPAIGN_NOT_SPENDING';

    results.push({
      id: 'RULE_TEST_C_SPEND_ZERO_AVAILABLE',
      name: 'Rule Test C: Spend 0 with Insight Available',
      description: 'Spend = 0 dengan insight data AVAILABLE harus men-trigger CAMPAIGN_NOT_SPENDING.',
      passed,
      expected: 'Signal CAMPAIGN_NOT_SPENDING triggered',
      actual: signal ? `Signal ${signal.type} triggered` : 'No signal triggered',
    });
  }

  // Rule Test D: Spend = null, dataAvailability = UNAVAILABLE -> CAMPAIGN_NOT_SPENDING MUST NOT trigger
  {
    const current = createMetrics({
      spend: null,
      impressions: null,
      dataAvailability: 'UNAVAILABLE',
    });
    const previous = createMetrics({});
    const ctx: RuleContext = {
      entityName: 'Test Campaign D',
      entityType: 'campaign',
      current,
      previous,
      targets: DEFAULT_TARGETS,
    };

    const rule = RULES.find((r) => r.id === 'CAMPAIGN_NOT_SPENDING');
    const signal = rule?.evaluate(ctx);
    const evalResult = evaluateEntity('d', 'Campaign D', 'campaign', current, previous, DEFAULT_TARGETS);
    const passed = signal === null && evalResult.status === 'NOT_ENOUGH_DATA';

    results.push({
      id: 'RULE_TEST_D_SPEND_NULL_UNAVAILABLE',
      name: 'Rule Test D: Spend null with Insight Unavailable',
      description: 'Spend = null dengan insight UNAVAILABLE TIDAK BOLEH men-trigger CAMPAIGN_NOT_SPENDING (harus NOT_ENOUGH_DATA).',
      passed,
      expected: 'CAMPAIGN_NOT_SPENDING is null, Evaluation status: NOT_ENOUGH_DATA',
      actual: `CAMPAIGN_NOT_SPENDING: ${signal ? signal.type : 'null'}, Overall Status: ${evalResult.status}`,
    });
  }

  // Rule Test E: CTR current = 1.2, CTR previous = null -> CTR_DROP MUST NOT trigger
  {
    const current = createMetrics({
      impressions: 1500,
      ctr: 1.2,
      dataAvailability: 'AVAILABLE',
    });
    const previous = createMetrics({
      impressions: null,
      ctr: null, // Previous CTR unavailable
    });
    const ctx: RuleContext = {
      entityName: 'Test Campaign E',
      entityType: 'campaign',
      current,
      previous,
      targets: DEFAULT_TARGETS,
    };

    const rule = RULES.find((r) => r.id === 'CTR_DROP');
    const signal = rule?.evaluate(ctx);
    const passed = signal === null;

    results.push({
      id: 'RULE_TEST_E_CTR_DROP_PREV_NULL',
      name: 'Rule Test E: CTR Current 1.2% with Previous CTR null',
      description: 'CTR previous null (trend unavailable) TIDAK BOLEH men-trigger CTR_DROP.',
      passed,
      expected: 'CTR_DROP is null (trend unavailable)',
      actual: signal ? `Unexpected signal: ${signal.type}` : 'CTR_DROP is null (Correctly Protected)',
    });
  }

  // Rule Test F: ROAS current = null, ROAS previous = 3 -> ROAS_DROP MUST NOT trigger
  {
    const current = createMetrics({
      spend: 300000,
      roas: null, // Revenue/ROAS untracked
      dataAvailability: 'AVAILABLE',
    });
    const previous = createMetrics({
      spend: 300000,
      roas: 3.0,
    });
    const ctx: RuleContext = {
      entityName: 'Test Campaign F',
      entityType: 'campaign',
      current,
      previous,
      targets: DEFAULT_TARGETS,
    };

    const rule = RULES.find((r) => r.id === 'ROAS_DROP');
    const signal = rule?.evaluate(ctx);
    const passed = signal === null;

    results.push({
      id: 'RULE_TEST_F_ROAS_CURRENT_NULL',
      name: 'Rule Test F: Current ROAS null with Previous ROAS 3.0x',
      description: 'Current ROAS null (revenue untracked) TIDAK BOLEH dianggap ROAS = 0 atau men-trigger ROAS_DROP.',
      passed,
      expected: 'ROAS_DROP is null (does not assume 0)',
      actual: signal ? `Unexpected signal: ${signal.type}` : 'ROAS_DROP is null (Correctly Protected)',
    });
  }

  // Rule Test G: Frequency = null -> HIGH_FREQUENCY MUST NOT trigger
  {
    const current = createMetrics({
      impressions: 5000,
      frequency: null,
      dataAvailability: 'AVAILABLE',
    });
    const previous = createMetrics({});
    const ctx: RuleContext = {
      entityName: 'Test Campaign G',
      entityType: 'campaign',
      current,
      previous,
      targets: DEFAULT_TARGETS,
    };

    const rule = RULES.find((r) => r.id === 'HIGH_FREQUENCY');
    const signal = rule?.evaluate(ctx);
    const passed = signal === null;

    results.push({
      id: 'RULE_TEST_G_FREQUENCY_NULL',
      name: 'Rule Test G: Frequency null Safety',
      description: 'Frequency null TIDAK BOLEH men-trigger HIGH_FREQUENCY atau diasumsikan default 1/0.',
      passed,
      expected: 'HIGH_FREQUENCY is null',
      actual: signal ? `Unexpected signal: ${signal.type}` : 'HIGH_FREQUENCY is null (Correctly Protected)',
    });
  }

  // Rule Test H: High Frequency, Stable CTR, Stable CPC -> CREATIVE_FATIGUE MUST NOT trigger
  {
    const current = createMetrics({
      impressions: 4000,
      ctr: 2.1,
      frequency: 3.5, // High frequency
      cpc: 1200,
      dataAvailability: 'AVAILABLE',
    });
    const previous = createMetrics({
      impressions: 3000,
      ctr: 2.1, // CTR stable (0% drop)
      frequency: 2.0,
      cpc: 1200, // CPC stable (0% spike)
    });
    const ctx: RuleContext = {
      entityName: 'Test Campaign H',
      entityType: 'campaign',
      current,
      previous,
      targets: DEFAULT_TARGETS,
    };

    const rule = RULES.find((r) => r.id === 'CREATIVE_FATIGUE');
    const signal = rule?.evaluate(ctx);
    const passed = signal === null;

    results.push({
      id: 'RULE_TEST_H_FATIGUE_FALSE_POSITIVE_PROTECTION',
      name: 'Rule Test H: High Frequency with Stable CTR & CPC',
      description: 'Frekuensi tinggi namun CTR stabil dan CPC stabil TIDAK BOLEH men-trigger CREATIVE_FATIGUE.',
      passed,
      expected: 'CREATIVE_FATIGUE is null (requires CTR drop and CPC spike evidence)',
      actual: signal ? `Unexpected signal: ${signal.type}` : 'CREATIVE_FATIGUE is null (Passed)',
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    timestamp: new Date().toISOString(),
    results,
  };
}
