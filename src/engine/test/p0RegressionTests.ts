import { BusinessTargets } from '../../types';
import {
  createUnknownPerformanceMetrics,
  mapMetaInsightsToPerformanceMetrics,
  assembleCampaignHierarchy,
} from '../../services/metaAds/metaAdsMapper';
import {
  aggregateMetrics,
  calculatePeriodMetricsSummary,
  calculateCreativeCompositeScore,
} from '../calculations/metrics';
import {
  evaluateEntityHealth,
  generateRecommendationsFromCampaigns,
  generateAlertsFromCampaigns,
} from '../rules/ruleEvaluator';
import { diagnoseFunnel } from '../funnel/funnelDiagnosisEngine';
import { generateDeterministicAnalysis } from '../../services/ai/aiAnalystService';
import { metaAdsService } from '../../services/metaAds/metaAdsService';
import { formatRupiah, formatRoas, formatFrequency, formatPercent, formatNumber } from '../../utils/formatters';
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

/**
 * Runs P0 Regression Test Suite for White Screen Prevention & Real Meta Token Flows:
 * 1. Semua metrik null
 * 2. Purchase tanpa revenue
 * 3. Campaign tanpa insights
 * 4. Token invalid
 * 5. Sync gagal
 * 6. Account tanpa campaign
 */
export async function runP0MetaRegressionTests(): Promise<IntegrityTestSuiteResult> {
  const results: IntegrityTestCaseResult[] = [];

  // 1. Semua metrik null
  {
    let passed = false;
    let actual = '';
    try {
      const unknown = createUnknownPerformanceMetrics();
      const agg = aggregateMetrics([unknown]);
      const summary = calculatePeriodMetricsSummary(agg, unknown, DEFAULT_TARGETS);
      const evaluation = evaluateEntityHealth(agg, unknown, DEFAULT_TARGETS);
      const funnel = diagnoseFunnel(agg, [], DEFAULT_TARGETS, unknown, []);
      const ai = generateDeterministicAnalysis({
        entityId: 'test_all_null',
        entityName: 'All Null Account',
        entityType: 'account',
        metrics: agg,
        previousMetrics: unknown,
        evaluation,
        targets: DEFAULT_TARGETS,
        funnelEvaluation: funnel,
      });

      const formattedChecks =
        formatRupiah(agg.spend) === 'N/A' &&
        formatRupiah(agg.cpa) === 'N/A' &&
        formatRoas(agg.roas) === 'N/A' &&
        formatFrequency(agg.frequency) === 'N/A' &&
        formatPercent(agg.ctr) === 'N/A' &&
        formatNumber(agg.impressions) === 'N/A';

      passed =
        agg.spend === null &&
        agg.impressions === null &&
        summary.spend.current === null &&
        evaluation.status === 'NOT_ENOUGH_DATA' &&
        funnel.primaryBottleneck === 'INSUFFICIENT_DATA' &&
        Boolean(ai.whatHappened) &&
        formattedChecks;

      actual = `eval=${evaluation.status}, funnel=${funnel.primaryBottleneck}, spendFmt=${formatRupiah(agg.spend)}, roasFmt=${formatRoas(agg.roas)}`;
    } catch (err: any) {
      passed = false;
      actual = `THREW: ${err?.message || String(err)}`;
    }

    results.push({
      id: 'P0_TEST_1_ALL_NULL_METRICS',
      name: '1. Semua Metrik Null (Zero-Crash Pipeline)',
      description: 'Pipeline Calculations, Rule Engine, Funnel Diagnosis, AI Deterministic, & Formatters aman saat semua metrik null dan menghasilkan N/A.',
      passed,
      expected: 'eval=NOT_ENOUGH_DATA, funnel=INSUFFICIENT_DATA, spendFmt=N/A, roasFmt=N/A',
      actual,
    });
  }

  // 2. Purchase tanpa revenue
  {
    let passed = false;
    let actual = '';
    try {
      const m = mapMetaInsightsToPerformanceMetrics({
        spend: '500000',
        impressions: '12000',
        reach: '8000',
        clicks: '240',
        actions: [
          { action_type: 'link_click', value: '200' },
          { action_type: 'purchase', value: '5' },
        ],
        // action_values sengaja tidak dikirim Meta
      } as any);
      const prev = createUnknownPerformanceMetrics();
      const evaluation = evaluateEntityHealth(m, prev, DEFAULT_TARGETS);
      const funnel = diagnoseFunnel(m, [], DEFAULT_TARGETS, prev, ['camp_1']);
      const ai = generateDeterministicAnalysis({
        entityId: 'camp_no_rev',
        entityName: 'Purchase No Revenue Campaign',
        entityType: 'campaign',
        metrics: m,
        previousMetrics: prev,
        evaluation,
        targets: DEFAULT_TARGETS,
        funnelEvaluation: funnel,
      });
      const aiWithoutFunnel = generateDeterministicAnalysis({
        entityId: 'camp_no_rev_2',
        entityName: 'Purchase No Revenue Campaign',
        entityType: 'campaign',
        metrics: m,
        previousMetrics: prev,
        evaluation,
        targets: DEFAULT_TARGETS,
      });

      passed =
        m.purchases === 5 &&
        m.revenue === null &&
        m.roas === null &&
        m.cpa === 100000 &&
        formatRoas(m.roas) === 'N/A' &&
        Boolean(ai.whatHappened) &&
        aiWithoutFunnel.whatHappened.includes('N/A');

      actual = `purchases=${m.purchases}, revenue=${m.revenue}, roas=${m.roas}, cpa=${m.cpa}, funnel=${funnel.primaryBottleneck}`;
    } catch (err: any) {
      passed = false;
      actual = `THREW: ${err?.message || String(err)}`;
    }

    results.push({
      id: 'P0_TEST_2_PURCHASE_WITHOUT_REVENUE',
      name: '2. Purchase Tanpa Revenue (ROAS Null Safety)',
      description: 'Purchase > 0 tanpa action_values revenue menghasilkan roas=null, tidak crash saat .toFixed() di Funnel/AI, dan tampil N/A.',
      passed,
      expected: 'purchases=5, revenue=null, roas=null, cpa=100000',
      actual,
    });
  }

  // 3. Campaign tanpa insights
  {
    let passed = false;
    let actual = '';
    try {
      const campaigns = assembleCampaignHierarchy({
        rawCampaigns: [
          { id: 'camp_no_ins', name: 'New Campaign Without Insights', status: 'ACTIVE', effective_status: 'ACTIVE', objective: 'OUTCOME_SALES' },
        ],
        rawAdSets: [
          { id: 'as_no_ins', campaign_id: 'camp_no_ins', name: 'AdSet 1', status: 'ACTIVE', effective_status: 'ACTIVE' },
        ],
        rawAds: [
          { id: 'ad_no_ins', adset_id: 'as_no_ins', campaign_id: 'camp_no_ins', name: 'Ad 1', status: 'ACTIVE', effective_status: 'ACTIVE' },
        ],
        currentCampaignInsights: new Map(),
        previousCampaignInsights: new Map(),
        currentAdSetInsights: new Map(),
        previousAdSetInsights: new Map(),
        currentAdInsights: new Map(),
        previousAdInsights: new Map(),
      });

      const camp = campaigns[0];
      const agg = aggregateMetrics(campaigns.map((c) => c.metrics));
      const evaluation = evaluateEntityHealth(agg, createUnknownPerformanceMetrics(), DEFAULT_TARGETS);
      const funnel = diagnoseFunnel(agg, [], DEFAULT_TARGETS, createUnknownPerformanceMetrics(), campaigns.map((c) => c.id));
      const recs = generateRecommendationsFromCampaigns(campaigns, DEFAULT_TARGETS, [], funnel);
      const alerts = generateAlertsFromCampaigns(campaigns, DEFAULT_TARGETS, []);
      const creativeScore = calculateCreativeCompositeScore(camp.adSets[0].ads[0], DEFAULT_TARGETS);

      passed =
        campaigns.length === 1 &&
        camp.metrics.dataAvailability === 'UNAVAILABLE' &&
        camp.metrics.spend === null &&
        camp.metrics.cpa === null &&
        camp.metrics.frequency === null &&
        evaluation.status === 'NOT_ENOUGH_DATA' &&
        funnel.primaryBottleneck === 'INSUFFICIENT_DATA' &&
        Array.isArray(recs) &&
        Array.isArray(alerts) &&
        creativeScore === null;

      actual = `availability=${camp.metrics.dataAvailability}, spend=${camp.metrics.spend}, eval=${evaluation.status}, funnel=${funnel.primaryBottleneck}, creativeScore=${creativeScore}`;
    } catch (err: any) {
      passed = false;
      actual = `THREW: ${err?.message || String(err)}`;
    }

    results.push({
      id: 'P0_TEST_3_CAMPAIGN_WITHOUT_INSIGHTS',
      name: '3. Campaign Tanpa Insights',
      description: 'Campaign, AdSet, dan Ad tanpa response insights memetakan semua metrik ke null (UNAVAILABLE), creativeScore=null, dan aman di seluruh engine.',
      passed,
      expected: 'availability=UNAVAILABLE, spend=null, eval=NOT_ENOUGH_DATA, funnel=INSUFFICIENT_DATA, creativeScore=null',
      actual,
    });
  }

  // Save service & fetch state before Real API mock tests
  const originalFetch = globalThis.fetch;
  const originalConfig = metaAdsService.getConnectionConfig();

  try {
    // 4. Token invalid (Meta API Error Code 190 -> REAUTH_REQUIRED)
    {
      let passed = false;
      let actual = '';
      try {
        globalThis.fetch = (async () =>
          new Response(
            JSON.stringify({
              error: {
                message: 'Invalid OAuth access token - Cannot parse access token',
                type: 'OAuthException',
                code: 190,
              },
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          )) as typeof fetch;

        metaAdsService.setConnectionConfig({
          mode: 'real',
          accessToken: 'INVALID_TEST_TOKEN',
          selectedAdAccountId: 'act_999999999',
        });

        const syncRes = await metaAdsService.refreshInsights('last_7_days');
        const evaluation = evaluateEntityHealth(syncRes.current, syncRes.previous, DEFAULT_TARGETS);
        const funnel = diagnoseFunnel(syncRes.current, [], DEFAULT_TARGETS, syncRes.previous, []);

        passed =
          syncRes.syncStatus === 'REAUTH_REQUIRED' &&
          syncRes.campaigns.length === 0 &&
          syncRes.current.spend === null &&
          syncRes.current.dataAvailability === 'UNAVAILABLE' &&
          Boolean(syncRes.errorMessage) &&
          evaluation.status === 'NOT_ENOUGH_DATA' &&
          funnel.primaryBottleneck === 'INSUFFICIENT_DATA';

        actual = `status=${syncRes.syncStatus}, campaigns=${syncRes.campaigns.length}, spend=${syncRes.current.spend}, funnel=${funnel.primaryBottleneck}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'P0_TEST_4_INVALID_TOKEN',
        name: '4. Token Meta Invalid (Error 190)',
        description: 'Token invalid menghasilkan syncStatus=REAUTH_REQUIRED, errorMessage jelas, dan metric null (bukan blank screen atau zero palsu).',
        passed,
        expected: 'status=REAUTH_REQUIRED, campaigns=0, spend=null, funnel=INSUFFICIENT_DATA',
        actual,
      });
    }

    // 5. Sync gagal (Network failure / HTTP 500)
    {
      let passed = false;
      let actual = '';
      try {
        globalThis.fetch = (async () => {
          throw new Error('Network request failed (Simulated 500 / Timeout)');
        }) as typeof fetch;

        metaAdsService.setConnectionConfig({
          mode: 'real',
          accessToken: 'EAAB_VALID_FORMAT_TOKEN',
          selectedAdAccountId: 'act_888888888',
        });

        const syncRes = await metaAdsService.refreshInsights('last_7_days');
        const evaluation = evaluateEntityHealth(syncRes.current, syncRes.previous, DEFAULT_TARGETS);
        const funnel = diagnoseFunnel(syncRes.current, [], DEFAULT_TARGETS, syncRes.previous, []);

        passed =
          syncRes.syncStatus === 'ERROR' &&
          syncRes.campaigns.length === 0 &&
          syncRes.current.spend === null &&
          syncRes.current.cpa === null &&
          Boolean(syncRes.errorMessage) &&
          evaluation.status === 'NOT_ENOUGH_DATA' &&
          funnel.primaryBottleneck === 'INSUFFICIENT_DATA';

        actual = `status=${syncRes.syncStatus}, campaigns=${syncRes.campaigns.length}, spend=${syncRes.current.spend}, error="${syncRes.errorMessage}"`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'P0_TEST_5_SYNC_FAILED',
        name: '5. Sync Meta API Gagal (Network/Server Error)',
        description: 'Kegagalan fetch Meta API menghasilkan syncStatus=ERROR dengan fallback createUnknownPerformanceMetrics (spend=null), tidak throw ke React.',
        passed,
        expected: 'status=ERROR, campaigns=0, spend=null',
        actual,
      });
    }

    // 6. Account tanpa campaign (Empty array response)
    {
      let passed = false;
      let actual = '';
      try {
        globalThis.fetch = (async () =>
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })) as typeof fetch;

        metaAdsService.setConnectionConfig({
          mode: 'real',
          accessToken: 'EAAB_VALID_EMPTY_ACC_TOKEN',
          selectedAdAccountId: 'act_777777777',
        });

        const syncRes = await metaAdsService.refreshInsights('last_7_days');
        const summary = calculatePeriodMetricsSummary(syncRes.current, syncRes.previous, DEFAULT_TARGETS);
        const evaluation = evaluateEntityHealth(syncRes.current, syncRes.previous, DEFAULT_TARGETS);
        const funnel = diagnoseFunnel(syncRes.current, [], DEFAULT_TARGETS, syncRes.previous, []);
        const recs = generateRecommendationsFromCampaigns(syncRes.campaigns, DEFAULT_TARGETS, [], funnel);
        const alerts = generateAlertsFromCampaigns(syncRes.campaigns, DEFAULT_TARGETS, []);

        passed =
          syncRes.syncStatus === 'SUCCESS' &&
          syncRes.campaigns.length === 0 &&
          syncRes.current.spend === null &&
          summary.spend.current === null &&
          evaluation.status === 'NOT_ENOUGH_DATA' &&
          funnel.primaryBottleneck === 'INSUFFICIENT_DATA' &&
          recs.length >= 1 &&
          alerts.length === 0;

        actual = `status=${syncRes.syncStatus}, campaigns=${syncRes.campaigns.length}, spend=${syncRes.current.spend}, funnel=${funnel.primaryBottleneck}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'P0_TEST_6_EMPTY_ACCOUNT',
        name: '6. Ad Account Tanpa Campaign',
        description: 'Akun Meta valid dengan 0 campaign menghasilkan syncStatus=SUCCESS, campaigns=[], metrik null, dan Funnel Diagnosis INSUFFICIENT_DATA tanpa crash.',
        passed,
        expected: 'status=SUCCESS, campaigns=0, spend=null, funnel=INSUFFICIENT_DATA',
        actual,
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
    metaAdsService.disconnect();
    metaAdsService.setConnectionConfig(originalConfig);
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
