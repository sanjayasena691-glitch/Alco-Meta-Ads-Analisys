import { BusinessTargets, AdCreative } from '../../types';
import { LandingPageWithMetrics } from '../../services/clarity/clarityTypes';
import {
  createUnknownPerformanceMetrics,
  mapMetaInsightsToPerformanceMetrics,
  mapDailyInsightsToTrendPoints,
  extractPurchaseAndRevenue,
  getActionValue,
  ACTION_TYPES,
} from '../../services/metaAds/metaAdsMapper';
import {
  aggregateMetrics,
  calculateCreativeCompositeScore,
} from '../calculations/metrics';
import { diagnoseFunnel } from '../funnel/funnelDiagnosisEngine';
import { metaAdsService } from '../../services/metaAds/metaAdsService';
import { clarityService } from '../../services/clarity/clarityService';
import { requestAiDiagnosis } from '../../services/ai/aiAnalystService';
import { evaluateEntityHealth } from '../rules/ruleEvaluator';
import { IntegrityTestCaseResult, IntegrityTestSuiteResult } from './metaIntegrityTests';

const DEFAULT_TARGETS: BusinessTargets = {
  productName: 'Produk Uji ALCO',
  productPrice: 200000,
  targetCpa: 40000,
  breakEvenCpa: 60000,
  targetRoas: 3.0,
  dailyBudget: 500000,
  targetCtr: 1.8,
};

function makeAd(overrides: Partial<AdCreative>): AdCreative {
  return {
    id: 'ad_test_1',
    adSetId: 'as_1',
    campaignId: 'camp_1',
    name: 'Test Creative',
    format: 'Video',
    hookText: 'Test Hook',
    status: 'HEALTHY',
    metrics: createUnknownPerformanceMetrics(),
    previousMetrics: createUnknownPerformanceMetrics(),
    ...overrides,
  };
}

/**
 * Runs Real Mode Trustworthiness Regression Suite covering all 9 integrity fixes.
 */
export async function runRealModeTrustworthinessTests(): Promise<IntegrityTestSuiteResult> {
  const results: IntegrityTestCaseResult[] = [];
  const originalFetch = globalThis.fetch;
  const originalMetaConfig = metaAdsService.getConnectionConfig();
  const originalClarityConfig = clarityService.getConnectionConfig();

  try {
    // 1. Explicit MOCK / REAL Data Isolation
    {
      let passed = false;
      let actual = '';
      try {
        // Mock mode returns mock campaigns
        metaAdsService.setConnectionConfig({ mode: 'mock' });
        const mockRes = await metaAdsService.getInsights('last_7_days');

        // Real mode on error returns empty campaigns + unknown metrics (never mock data)
        globalThis.fetch = (async () =>
          new Response(JSON.stringify({ error: { message: 'Server error', code: 500 } }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })) as typeof fetch;

        metaAdsService.setConnectionConfig({
          mode: 'real',
          accessToken: 'EAAB_ISOLATION_TOKEN',
          selectedAdAccountId: 'act_111222333',
        });
        const realErrRes = await metaAdsService.refreshInsights('last_7_days');

        passed =
          mockRes.isRealMode === false &&
          mockRes.campaigns.length > 0 &&
          realErrRes.syncStatus === 'ERROR' &&
          realErrRes.campaigns.length === 0 &&
          realErrRes.dailyTrend.length === 0 &&
          realErrRes.current.spend === null &&
          realErrRes.current.dataAvailability === 'UNAVAILABLE';

        actual = `mockCampaigns=${mockRes.campaigns.length}, realErrStatus=${realErrRes.syncStatus}, realCampaigns=${realErrRes.campaigns.length}, realTrend=${realErrRes.dailyTrend.length}, realSpend=${realErrRes.current.spend}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'TRUST_1_MOCK_REAL_ISOLATION',
        name: '1. Isolasi Eksplisit Mode Mock vs Real',
        description: 'Error atau sync gagal pada Real Mode mengembalikan state kosong/UNKNOWN dan tidak pernah membocorkan data Mock.',
        passed,
        expected: 'mockCampaigns>0, realErrStatus=ERROR, realCampaigns=0, realTrend=0, realSpend=null',
        actual,
      });
    }

    // 2. Prevent Mock Clarity Data from Participating in Real Mode Diagnosis
    {
      let passed = false;
      let actual = '';
      try {
        clarityService.setConnectionConfig({ isMockMode: true, isConnected: true });
        const lpsMock = await clarityService.getLandingPages('last_7_days', 'mock');
        const lpsReal = await clarityService.getLandingPages('last_7_days', 'real');
        const refreshReal = await clarityService.refreshData('last_7_days', 'real');

        const metaMetrics = mapMetaInsightsToPerformanceMetrics({
          spend: '600000',
          impressions: '20000',
          reach: '14000',
          clicks: '400',
          actions: [
            { action_type: 'link_click', value: '350' },
            { action_type: 'landing_page_view', value: '200' },
            { action_type: 'purchase', value: '2' },
          ],
          action_values: [{ action_type: 'purchase', value: '400000' }],
        } as any);

        const funnelReal = diagnoseFunnel(metaMetrics, lpsReal as LandingPageWithMetrics[], DEFAULT_TARGETS, undefined, ['camp_1']);

        const engagedStage = funnelReal.funnelStages?.find((s) => s.stageKey === 'engaged_visitor');

        passed =
          lpsMock.length > 0 &&
          lpsReal.length === 0 &&
          refreshReal.landingPages.length === 0 &&
          funnelReal.dataCoverage?.lpCoveragePercent === 0 &&
          engagedStage?.source === 'UNKNOWN';

        actual = `lpsMock=${lpsMock.length}, lpsReal=${lpsReal.length}, lpCoverage=${funnelReal.dataCoverage?.lpCoveragePercent}, engagedSource=${engagedStage?.source}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'TRUST_2_CLARITY_ISOLATION',
        name: '2. Isolasi Data Mock Clarity di Real Mode',
        description: 'Data mock Microsoft Clarity dikecualikan ([] / clarityMetricsCount=0) saat Meta Ads berada di Real Mode.',
        passed,
        expected: 'lpsMock>0, lpsReal=0, clarityCountInFunnel=0, lpMetricsDefined=false',
        actual,
      });
    }

    // 3. Real Daily Trend Mapping & Null Preservation
    {
      let passed = false;
      let actual = '';
      try {
        const trend = mapDailyInsightsToTrendPoints([
          {
            date_start: '2025-05-12',
            date_stop: '2025-05-12',
            spend: '100000',
            impressions: '4000',
            reach: '3000',
            clicks: '80',
            actions: [{ action_type: 'purchase', value: '0' }],
          },
          {
            date_start: '2025-05-10',
            date_stop: '2025-05-10',
            spend: '150000',
            impressions: '5000',
            clicks: '100',
            actions: [{ action_type: 'purchase', value: '2' }],
            action_values: [{ action_type: 'purchase', value: '450000' }],
          },
        ] as any);

        const emptyTrend = mapDailyInsightsToTrendPoints([]);

        passed =
          trend.length === 2 &&
          trend[0].date === '10 Mei' &&
          trend[0].roas === 3 &&
          trend[0].frequency === null && // no reach -> frequency must stay null
          trend[1].date === '12 Mei' &&
          trend[1].purchases === 0 &&
          trend[1].cpa === null && // 0 purchases -> cpa null
          trend[1].roas === null && // missing action_values -> roas null
          emptyTrend.length === 0;

        actual = `len=${trend.length}, firstDate=${trend[0]?.date}, firstFreq=${trend[0]?.frequency}, secondCpa=${trend[1]?.cpa}, emptyLen=${emptyTrend.length}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'TRUST_3_REAL_DAILY_TREND',
        name: '3. Daily Trend Nyata & Pelestarian Null',
        description: 'Daily insights diurutkan ascending, nilai hilang tetap null (tidak difabrikasi jadi 0/1), dan array kosong menghasilkan [].',
        passed,
        expected: 'len=2, firstDate=10 Mei, firstFreq=null, secondCpa=null, emptyLen=0',
        actual,
      });
    }

    // 4. Account-Level Reach & Frequency (No Multi-Campaign Reach Summation)
    {
      let passed = false;
      let actual = '';
      try {
        const camp1 = mapMetaInsightsToPerformanceMetrics({
          spend: '200000',
          impressions: '6000',
          reach: '4000',
          clicks: '120',
          actions: [{ action_type: 'purchase', value: '2' }],
          action_values: [{ action_type: 'purchase', value: '600000' }],
        } as any);
        const camp2 = mapMetaInsightsToPerformanceMetrics({
          spend: '300000',
          impressions: '9000',
          reach: '5500',
          clicks: '180',
          actions: [{ action_type: 'purchase', value: '3' }],
          action_values: [{ action_type: 'purchase', value: '900000' }],
        } as any);

        const withoutAccountOverride = aggregateMetrics([camp1, camp2]);
        const authoritativeAccount = mapMetaInsightsToPerformanceMetrics({
          spend: '500000',
          impressions: '15000',
          reach: '7500', // Deduplicated across both campaigns (< 4000 + 5500 = 9500)
          clicks: '300',
          frequency: '2.0',
        } as any);
        const withAccountOverride = aggregateMetrics([camp1, camp2], authoritativeAccount);
        const singleCamp = aggregateMetrics([camp1]);

        passed =
          withoutAccountOverride.reach === null &&
          withoutAccountOverride.frequency === null &&
          withoutAccountOverride.spend === 500000 &&
          withAccountOverride.reach === 7500 &&
          withAccountOverride.frequency === 2 &&
          singleCamp.reach === 4000 &&
          singleCamp.frequency === 1.5;

        actual = `noOverrideReach=${withoutAccountOverride.reach}, noOverrideFreq=${withoutAccountOverride.frequency}, withOverrideReach=${withAccountOverride.reach}, withOverrideFreq=${withAccountOverride.frequency}, singleReach=${singleCamp.reach}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'TRUST_4_ACCOUNT_REACH_FREQUENCY',
        name: '4. Deduplikasi Reach & Frequency Account-Level',
        description: 'Agregasi multi-campaign tanpa insight level-account menghasilkan reach/frequency null (tidak menjumlahkan reach antar campaign).',
        passed,
        expected: 'noOverrideReach=null, noOverrideFreq=null, withOverrideReach=7500, withOverrideFreq=2, singleReach=4000',
        actual,
      });
    }

    // 5. Preserve UNKNOWN vs ZERO vs PARTIAL
    {
      let passed = false;
      let actual = '';
      try {
        const unknown = mapMetaInsightsToPerformanceMetrics(undefined);
        const zeroDelivery = mapMetaInsightsToPerformanceMetrics({
          spend: '0',
          impressions: '0',
          reach: '0',
          clicks: '0',
          actions: [],
        } as any);
        const partial = mapMetaInsightsToPerformanceMetrics({
          spend: '250000',
          impressions: '5000',
          reach: '3500',
          clicks: '100',
          actions: [{ action_type: 'purchase', value: '3' }],
          // action_values missing -> revenue unknown -> PARTIAL
        } as any);
        const full = mapMetaInsightsToPerformanceMetrics({
          spend: '250000',
          impressions: '5000',
          reach: '3500',
          clicks: '100',
          actions: [{ action_type: 'purchase', value: '3' }],
          action_values: [{ action_type: 'purchase', value: '750000' }],
        } as any);
        const mixedAgg = aggregateMetrics([full, partial]);

        passed =
          unknown.dataAvailability === 'UNAVAILABLE' &&
          unknown.spend === null &&
          zeroDelivery.dataAvailability === 'AVAILABLE' &&
          zeroDelivery.spend === 0 &&
          zeroDelivery.roas === null &&
          partial.dataAvailability === 'PARTIAL' &&
          partial.revenue === null &&
          full.dataAvailability === 'AVAILABLE' &&
          mixedAgg.dataAvailability === 'PARTIAL';

        actual = `unknown=${unknown.dataAvailability}, zero=${zeroDelivery.dataAvailability}(roas=${zeroDelivery.roas}), partial=${partial.dataAvailability}, full=${full.dataAvailability}, mixed=${mixedAgg.dataAvailability}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'TRUST_5_UNKNOWN_ZERO_PARTIAL',
        name: '5. Pembedaan UNKNOWN vs ZERO vs PARTIAL',
        description: 'Insight kosong -> UNAVAILABLE, nol nyata -> AVAILABLE (roas null saat spend=0), metrik hilang sebagian -> PARTIAL.',
        passed,
        expected: 'unknown=UNAVAILABLE, zero=AVAILABLE(roas=null), partial=PARTIAL, full=AVAILABLE, mixed=PARTIAL',
        actual,
      });
    }

    // 6. Purchase/Revenue Action Priority & Canonical Attribution Matching + URL Param
    {
      let passed = false;
      let actual = '';
      try {
        // Priority order must respect ACTION_TYPES.PURCHASES, NOT Meta raw array index order
        const prioritized = getActionValue(
          [
            { action_type: 'offsite_conversion.fb_pixel_purchase', value: '9' },
            { action_type: 'purchase', value: '4' },
          ],
          ACTION_TYPES.PURCHASES
        );

        // Paired matching selects `omni_purchase` in BOTH actions and action_values when `purchase` lacks revenue
        const paired = extractPurchaseAndRevenue(
          [
            { action_type: 'purchase', value: '5' },
            { action_type: 'omni_purchase', value: '4' },
          ],
          [{ action_type: 'omni_purchase', value: '1200000' }]
        );

        // Mismatched keys across actions & action_values flags attributionConsistent = false
        const mismatched = extractPurchaseAndRevenue(
          [{ action_type: 'purchase', value: '3' }],
          [{ action_type: 'offsite_conversion.fb_pixel_purchase', value: '900000' }]
        );

        // Verify Meta request URL passes use_account_attribution_setting=true
        let capturedUrls: string[] = [];
        globalThis.fetch = (async (input: RequestInfo | URL) => {
          capturedUrls.push(String(input));
          return new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }) as typeof fetch;

        metaAdsService.setConnectionConfig({
          mode: 'real',
          accessToken: 'EAAB_URL_CHECK',
          selectedAdAccountId: 'act_444555666',
        });
        await metaAdsService.refreshInsights('last_7_days');
        const insightUrls = capturedUrls.filter((u) => u.includes('/insights'));
        const hasAttrParam = insightUrls.length > 0 && insightUrls.every((u) => u.includes('use_account_attribution_setting=true'));
        const hasDailyParam = insightUrls.some((u) => u.includes('time_increment=1'));

        passed =
          prioritized === 4 &&
          paired.purchases === 4 &&
          paired.revenue === 1200000 &&
          paired.purchaseActionType === 'omni_purchase' &&
          paired.attributionConsistent === true &&
          mismatched.attributionConsistent === false &&
          hasAttrParam &&
          hasDailyParam;

        actual = `prioritized=${prioritized}, paired=(${paired.purchases},${paired.revenue},${paired.purchaseActionType},${paired.attributionConsistent}), mismatchedAttr=${mismatched.attributionConsistent}, hasAttrParam=${hasAttrParam}, hasDailyParam=${hasDailyParam}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'TRUST_6_PURCHASE_ATTRIBUTION_MAPPING',
        name: '6. Prioritas Action Purchase & Konsistensi Atribusi',
        description: 'Prioritas action mengikuti urutan kanonik, pairing purchase+revenue memakai tipe konsisten, dan request Meta menyertakan use_account_attribution_setting=true.',
        passed,
        expected: 'prioritized=4, paired=(4,1200000,omni_purchase,true), mismatchedAttr=false, hasAttrParam=true, hasDailyParam=true',
        actual,
      });
    }

    // 7. LP Technical Issues Treated as Hypothesis Without Technical Evidence
    {
      let passed = false;
      let actual = '';
      try {
        const metaLowLpView = mapMetaInsightsToPerformanceMetrics({
          spend: '450000',
          impressions: '15000',
          reach: '11000',
          clicks: '250',
          actions: [
            { action_type: 'link_click', value: '200' },
            { action_type: 'landing_page_view', value: '100' }, // LP View Rate = 50% (< 72%)
            { action_type: 'purchase', value: '0' },
          ],
        } as any);

        // Case A: Real Mode without Clarity technical telemetry -> must NOT blame confirmed LANDING_PAGE_TECHNICAL
        const withoutTechTelemetry = diagnoseFunnel(metaLowLpView, [], DEFAULT_TARGETS, undefined, ['camp_1']);

        // Case B: With Clarity scriptErrors >= 8 -> confirmed LANDING_PAGE_TECHNICAL
        const withClarityCrash = diagnoseFunnel(
          metaLowLpView,
          [
            {
              profile: {
                id: 'lp_crash',
                clarityProjectId: 'p1',
                name: 'LP Crash',
                url: 'https://example.com',
                linkedCampaignIds: ['camp_1'],
                lastSyncedAt: '10:00',
              },
              metrics: {
                pageUrl: 'https://example.com',
                sessions: 100,
                scrollDepthAvg: 40,
                avgEngagementTimeSec: 25,
                rageClicks: 2,
                deadClicks: 5,
                excessiveScrolls: 10,
                quickBacks: 15,
                scriptErrors: 12,
                ctaClicks: 10,
                checkoutStarts: 2,
                purchases: 0,
              },
            },
          ],
          DEFAULT_TARGETS,
          undefined,
          ['camp_1']
        );

        passed =
          withoutTechTelemetry.primaryBottleneck !== 'LANDING_PAGE_TECHNICAL' &&
          withoutTechTelemetry.bottleneckTitle.includes('Hipotesis') &&
          withClarityCrash.primaryBottleneck === 'LANDING_PAGE_TECHNICAL';

        actual = `noTechBottleneck=${withoutTechTelemetry.primaryBottleneck} ("${withoutTechTelemetry.bottleneckTitle}"), withCrashBottleneck=${withClarityCrash.primaryBottleneck}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'TRUST_7_LP_TECHNICAL_HYPOTHESIS',
        name: '7. Masalah Teknis LP sebagai Hipotesis Tanpa Bukti Teknis',
        description: 'LP View Rate rendah tanpa data telemetri Clarity tidak boleh divonis sebagai LANDING_PAGE_TECHNICAL terkonfirmasi.',
        passed,
        expected: 'noTechBottleneck!=LANDING_PAGE_TECHNICAL (contains Hipotesis), withCrashBottleneck=LANDING_PAGE_TECHNICAL',
        actual,
      });
    }

    // 8. Creative Composite Score Returns Null When Essential Metrics Unavailable
    {
      let passed = false;
      let actual = '';
      try {
        const adNoInsight = makeAd({ id: 'ad_none', metrics: createUnknownPerformanceMetrics() });
        const adPurchaseNoRev = makeAd({
          id: 'ad_norev',
          metrics: mapMetaInsightsToPerformanceMetrics({
            spend: '300000',
            impressions: '10000',
            reach: '7000',
            clicks: '200',
            actions: [{ action_type: 'purchase', value: '3' }],
          } as any),
        });
        const adLowVolume = makeAd({
          id: 'ad_low',
          metrics: mapMetaInsightsToPerformanceMetrics({
            spend: '10000', // < 0.7 * targetCpa (28000)
            impressions: '500',
            reach: '450',
            clicks: '10',
            actions: [{ action_type: 'purchase', value: '0' }],
          } as any),
        });
        const adComplete = makeAd({
          id: 'ad_ok',
          metrics: mapMetaInsightsToPerformanceMetrics({
            spend: '400000',
            impressions: '12000',
            reach: '8500',
            clicks: '300',
            actions: [{ action_type: 'purchase', value: '8' }],
            action_values: [{ action_type: 'purchase', value: '1600000' }],
          } as any),
        });

        const sNone = calculateCreativeCompositeScore(adNoInsight, DEFAULT_TARGETS);
        const sNoRev = calculateCreativeCompositeScore(adPurchaseNoRev, DEFAULT_TARGETS);
        const sLow = calculateCreativeCompositeScore(adLowVolume, DEFAULT_TARGETS);
        const sOk = calculateCreativeCompositeScore(adComplete, DEFAULT_TARGETS);

        passed =
          sNone === null &&
          sNoRev === null &&
          sLow === null &&
          typeof sOk === 'number' &&
          Number.isFinite(sOk) &&
          sOk > 0;

        actual = `sNone=${sNone}, sNoRev=${sNoRev}, sLow=${sLow}, sOk=${sOk}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'TRUST_8_CREATIVE_SCORE_NULL_SAFETY',
        name: '8. Creative Scoring Null Saat Metrik Esensial Hilang',
        description: 'Creative tanpa insight, tanpa revenue saat ada purchase, atau spend belum memenuhi threshold menghasilkan score null (tidak difabrikasi).',
        passed,
        expected: 'sNone=null, sNoRev=null, sLow=null, sOk=number>0',
        actual,
      });
    }

    // 9. Preserve Original AI Response Source ('gemini' vs 'rule_engine')
    {
      let passed = false;
      let actual = '';
      try {
        const sampleMetrics = mapMetaInsightsToPerformanceMetrics({
          spend: '400000',
          impressions: '12000',
          reach: '9000',
          clicks: '240',
          actions: [{ action_type: 'purchase', value: '4' }],
          action_values: [{ action_type: 'purchase', value: '1200000' }],
        } as any);
        const prev = createUnknownPerformanceMetrics();
        const evaluation = evaluateEntityHealth(sampleMetrics, prev, DEFAULT_TARGETS);

        globalThis.fetch = (async () =>
          new Response(
            JSON.stringify({
              entityName: 'Test Camp',
              entityType: 'campaign',
              primaryBottleneck: 'HEALTHY',
              secondaryIssue: null,
              whereTheProblemIs: 'Kinerja Stabil',
              whatHappened: 'Fallback rule engine response',
              why: 'Reason',
              possibleCause: 'Cause',
              evidence: ['E1'],
              recommendedAction: 'Act',
              dontDoYet: 'Wait',
              nextThingToMonitor: 'Monitor',
              confidence: 'High',
              source: 'rule_engine',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )) as typeof fetch;

        const ruleRes = await requestAiDiagnosis({
          entityId: 'camp_1',
          entityName: 'Test Camp',
          entityType: 'campaign',
          metrics: sampleMetrics,
          previousMetrics: prev,
          evaluation,
          targets: DEFAULT_TARGETS,
        });

        globalThis.fetch = (async () =>
          new Response(
            JSON.stringify({
              entityName: 'Test Camp',
              entityType: 'campaign',
              primaryBottleneck: 'HEALTHY',
              secondaryIssue: null,
              whereTheProblemIs: 'Kinerja Stabil',
              whatHappened: 'Gemini AI response',
              why: 'Reason',
              possibleCause: 'Cause',
              evidence: ['E1'],
              recommendedAction: 'Act',
              dontDoYet: 'Wait',
              nextThingToMonitor: 'Monitor',
              confidence: 'High',
              source: 'gemini',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )) as typeof fetch;

        const geminiRes = await requestAiDiagnosis({
          entityId: 'camp_1',
          entityName: 'Test Camp',
          entityType: 'campaign',
          metrics: sampleMetrics,
          previousMetrics: prev,
          evaluation,
          targets: DEFAULT_TARGETS,
        });

        passed = ruleRes.source === 'rule_engine' && geminiRes.source === 'gemini';
        actual = `ruleRes.source=${ruleRes.source}, geminiRes.source=${geminiRes.source}`;
      } catch (err: any) {
        passed = false;
        actual = `THREW: ${err?.message || String(err)}`;
      }

      results.push({
        id: 'TRUST_9_AI_SOURCE_ATTRIBUTION',
        name: '9. Preservasi Sumber Asli Respons AI',
        description: 'requestAiDiagnosis menjaga field source asli (gemini vs rule_engine) tanpa mengklaim fallback sebagai Gemini.',
        passed,
        expected: 'ruleRes.source=rule_engine, geminiRes.source=gemini',
        actual,
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
    metaAdsService.disconnect();
    metaAdsService.setConnectionConfig(originalMetaConfig);
    clarityService.setConnectionConfig(originalClarityConfig);
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
