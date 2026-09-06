import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sidebar, 
  NavTab 
} from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { MobileNav } from './components/layout/MobileNav';
import { AccountHealthBanner } from './components/dashboard/AccountHealthBanner';
import { MetricCardsGrid } from './components/dashboard/MetricCardsGrid';
import { TrendPerformanceChart } from './components/dashboard/TrendPerformanceChart';
import { FunnelDiagnosisCard } from './components/funnel/FunnelDiagnosisCard';
import { LandingPageHealthView } from './components/landingPage/LandingPageHealthView';
import { CampaignTable } from './components/campaigns/CampaignTable';
import { CampaignDrilldownModal } from './components/campaigns/CampaignDrilldownModal';
import { CreativePerformanceView } from './components/creatives/CreativePerformanceView';
import { PerformanceTargetsView } from './components/targets/PerformanceTargetsView';
import { RecommendationCenter } from './components/recommendations/RecommendationCenter';
import { AlertSystemView } from './components/alerts/AlertSystemView';
import { MetaIntegrationView } from './components/integrations/MetaIntegrationView';
import { SettingsView } from './components/settings/SettingsView';
import { AiAnalystModal } from './components/ai/AiAnalystModal';
import { AiExplanationCard } from './components/ai/AiExplanationCard';

import { 
  Campaign, 
  TimePeriod, 
  BusinessTargets, 
  HealthStatus, 
  AnomalyAlert, 
  RecommendationCardItem,
  StructuredAiAnalysis
} from './types';
import { DEFAULT_BUSINESS_TARGETS, MOCK_TREND_DATA, INITIAL_CAMPAIGNS } from './mock/metaData';
import { metaAdsService } from './services/metaAds/metaAdsService';
import { clarityService } from './services/clarity/clarityService';
import { 
  aggregateMetrics, 
  calculatePeriodMetricsSummary 
} from './engine/calculations/metrics';
import { 
  evaluateEntityHealth, 
  generateRecommendationsFromCampaigns, 
  generateAlertsFromCampaigns 
} from './engine/rules/ruleEvaluator';
import { diagnoseFunnel } from './engine/funnel/funnelDiagnosisEngine';
import { requestAiDiagnosis } from './services/ai/aiAnalystService';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [currentPeriod, setCurrentPeriod] = useState<TimePeriod>('last_7_days');

  // Business Target State
  const [targets, setTargets] = useState<BusinessTargets>(DEFAULT_BUSINESS_TARGETS);

  // Campaigns & Meta Integration State
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );
  const [metaConfig, setMetaConfig] = useState(metaAdsService.getConnectionConfig());

  // Landing Pages & Clarity Integration State
  const [landingPages, setLandingPages] = useState(clarityService.getInitialLandingPages());
  const [clarityConfig, setClarityConfig] = useState(clarityService.getConnectionConfig());
  const [isSyncingClarity, setIsSyncingClarity] = useState<boolean>(false);
  const [claritySyncNotice, setClaritySyncNotice] = useState<string | undefined>();

  // Modal States
  const [selectedDrilldownCampaign, setSelectedDrilldownCampaign] = useState<Campaign | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiModalEntity, setAiModalEntity] = useState<any>(null);

  // Overview AI Diagnosis Widget State
  const [overviewAiDiagnosis, setOverviewAiDiagnosis] = useState<StructuredAiAnalysis | null>(null);
  const [isLoadingOverviewAi, setIsLoadingOverviewAi] = useState<boolean>(false);

  // Derived Metrics & Rule Engine Evaluations
  const currentMetricsList = useMemo(() => campaigns.map((c) => c.metrics), [campaigns]);
  const previousMetricsList = useMemo(() => campaigns.map((c) => c.previousMetrics), [campaigns]);

  const aggregatedCurrent = useMemo(() => aggregateMetrics(currentMetricsList), [currentMetricsList]);
  const aggregatedPrevious = useMemo(() => aggregateMetrics(previousMetricsList), [previousMetricsList]);

  const metricsSummary = useMemo(() => {
    return calculatePeriodMetricsSummary(aggregatedCurrent, aggregatedPrevious, targets);
  }, [aggregatedCurrent, aggregatedPrevious, targets]);

  const accountEvaluation = useMemo(() => {
    return evaluateEntityHealth(aggregatedCurrent, aggregatedPrevious, targets);
  }, [aggregatedCurrent, aggregatedPrevious, targets]);

  // End-to-End Funnel Diagnosis (Meta Ads + Clarity Landing Pages)
  const funnelDiagnosis = useMemo(() => {
    const activeCampaignIds = campaigns.map((c) => c.id);
    return diagnoseFunnel(aggregatedCurrent, landingPages, targets, aggregatedPrevious, activeCampaignIds);
  }, [aggregatedCurrent, landingPages, targets, aggregatedPrevious, campaigns]);

  // Recommendations & Alerts
  const allRecommendations = useMemo(() => {
    return generateRecommendationsFromCampaigns(campaigns, targets);
  }, [campaigns, targets]);

  const allAlerts = useMemo(() => {
    return generateAlertsFromCampaigns(campaigns, targets);
  }, [campaigns, targets]);

  // All Creatives List for Creative Ranking View
  const allCreatives = useMemo(() => {
    return campaigns.flatMap((c) => c.adSets.flatMap((as) => as.ads));
  }, [campaigns]);

  // Priority Issue for Account Health Banner (e.g. Creative Fatigue on Video 03)
  const priorityFatiguedAd = useMemo(() => {
    return allCreatives.find((ad) => ad.status === 'PROBLEM' && ad.metrics.frequency >= 3.0);
  }, [allCreatives]);

  // Sync / Refresh Handler for Meta Ads
  const handleRefreshData = async () => {
    setIsSyncing(true);
    try {
      const res = await metaAdsService.refreshInsights(currentPeriod);
      setLastSyncedAt(res.lastSyncedAt);
      setCampaigns(res.campaigns);
      setMetaConfig(metaAdsService.getConnectionConfig());
    } finally {
      setIsSyncing(false);
    }
  };

  // Change Period Handler - Correctly updates campaign & landing page state
  const handleSelectPeriod = async (period: TimePeriod) => {
    setCurrentPeriod(period);
    setIsSyncing(true);
    try {
      const [insights, scaledLps] = await Promise.all([
        metaAdsService.getInsights(period),
        clarityService.getLandingPages(period)
      ]);
      setCampaigns(insights.campaigns);
      setLandingPages(scaledLps);
      setLastSyncedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      setIsSyncing(false);
    } catch {
      setIsSyncing(false);
    }
  };

  // Refresh Clarity Data Handler
  const handleRefreshClarity = async () => {
    setIsSyncingClarity(true);
    try {
      const res = await clarityService.refreshData();
      setLandingPages(res.landingPages);
      setClarityConfig(clarityService.getConnectionConfig());
      if (res.isRateLimited) {
        setClaritySyncNotice('Rate limit cooldown aktif (Clarity API standard). Data disajikan dari cache lokal.');
      } else {
        setClaritySyncNotice('Data Clarity berhasil disinkronkan langsung.');
      }
      setTimeout(() => setClaritySyncNotice(undefined), 4000);
    } finally {
      setIsSyncingClarity(false);
    }
  };

  // Update Landing Page to Campaign mapping
  const handleUpdateLandingPageMapping = (lpId: string, linkedCampaignIds: string[]) => {
    const updated = clarityService.updateCampaignMapping(lpId, linkedCampaignIds);
    setLandingPages(updated);
  };

  // Trigger AI Diagnosis for a specific entity
  const handleOpenAiDiagnosis = (entityName: string, entityType: any, metrics: any) => {
    setAiModalEntity({
      name: entityName,
      type: entityType,
      metrics,
    });
    setIsAiModalOpen(true);
  };

  // Synchronize Overview AI Analysis with Meta & Landing Page data changes without infinite requests
  const aiSyncKey = useMemo(() => {
    return `${currentPeriod}_${lastSyncedAt}_${targets.targetCpa}_${targets.targetRoas}_${campaigns.reduce((acc, c) => acc + c.metrics.spend, 0)}`;
  }, [currentPeriod, lastSyncedAt, targets.targetCpa, targets.targetRoas, campaigns]);

  useEffect(() => {
    let isCancelled = false;
    async function loadOverviewAi() {
      setIsLoadingOverviewAi(true);
      try {
        const diagnosis = await requestAiDiagnosis({
          entityId: 'account_overview',
          entityName: 'ALCO Digital Academy Account',
          entityType: 'account',
          metrics: aggregatedCurrent,
          previousMetrics: aggregatedPrevious,
          evaluation: accountEvaluation,
          targets,
          funnelEvaluation: funnelDiagnosis,
          landingPageMetrics: landingPages[0]?.metrics,
        });
        if (!isCancelled) {
          setOverviewAiDiagnosis(diagnosis);
        }
      } catch {
        // Fallback error handling
      } finally {
        if (!isCancelled) {
          setIsLoadingOverviewAi(false);
        }
      }
    }
    loadOverviewAi();
    return () => {
      isCancelled = true;
    };
  }, [aiSyncKey]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col antialiased font-sans">
      <div className="flex-1 flex min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          alertCount={allAlerts.length}
          recommendationCount={allRecommendations.length}
        />

        {/* Main Application Container */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
          {/* Top Sticky Header */}
          <TopHeader
            currentPeriod={currentPeriod}
            onSelectPeriod={handleSelectPeriod}
            lastSyncedAt={lastSyncedAt}
            isSyncing={isSyncing}
            onRefreshData={handleRefreshData}
            targets={targets}
            onOpenTargets={() => setCurrentTab('targets')}
            onOpenAiAnalyst={() => {
              setAiModalEntity(null);
              setIsAiModalOpen(true);
            }}
            accountName="ALCO Digital Academy"
          />

          {/* Main View Area */}
          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
            {/* VIEW 1: DASHBOARD OVERVIEW */}
            {currentTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1. Account Health Status Banner */}
                <AccountHealthBanner
                  healthStatus={accountEvaluation.status as HealthStatus}
                  issueCount={allAlerts.length}
                  onAnalyzeWithAi={() => {
                    setAiModalEntity({
                      name: 'Account Health',
                      type: 'account',
                      metrics: aggregatedCurrent,
                    });
                    setIsAiModalOpen(true);
                  }}
                  priorityIssue={
                    priorityFatiguedAd
                      ? {
                          entityName: priorityFatiguedAd.name,
                          entityType: 'Ad Creative',
                          issueTitle: 'Possible Creative Fatigue (Penurunan CTR & Lonjakan Frekuensi)',
                          signalType: 'CREATIVE_FATIGUE',
                          metricChanges: [
                            { label: 'CTR', change: '↓ 34%', isNegative: true },
                            { label: 'Frequency', change: '↑ 58%', isNegative: true },
                          ],
                          onViewDetail: () => {
                            handleOpenAiDiagnosis(priorityFatiguedAd.name, 'ad', priorityFatiguedAd.metrics);
                          },
                        }
                      : undefined
                  }
                />

                {/* 2. End-to-End Funnel Diagnosis Card */}
                <FunnelDiagnosisCard
                  diagnosis={funnelDiagnosis}
                  onOpenAiConsultant={() => {
                    setAiModalEntity({
                      name: 'Funnel & Conversion Flow',
                      type: 'funnel',
                      metrics: funnelDiagnosis.metrics,
                    });
                    setIsAiModalOpen(true);
                  }}
                  onNavigateToLandingPages={() => setCurrentTab('landing_pages')}
                />

                {/* 3. Core Metrics Cards Grid */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Ringkasan Kinerja Akun
                    </h3>
                    <span className="text-xs text-gray-400">
                      Target: {targets.productName} (CPA &le; Rp{targets.targetCpa.toLocaleString('id-ID')})
                    </span>
                  </div>
                  <MetricCardsGrid summary={metricsSummary} currentPeriod={currentPeriod} />
                </div>

                {/* 4. AI Recommendation Spotlight */}
                {overviewAiDiagnosis && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Hasil Diagnosis AI Terbaru
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setAiModalEntity(null);
                          setIsAiModalOpen(true);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Buka Konsultan AI &rarr;
                      </button>
                    </div>
                    <AiExplanationCard analysis={overviewAiDiagnosis} />
                  </div>
                )}

                {/* 5. Trend Performance Chart */}
                <TrendPerformanceChart data={MOCK_TREND_DATA} />

                {/* 6. Campaign Performance Snapshot */}
                <CampaignTable
                  campaigns={campaigns}
                  onSelectCampaign={(c) => setSelectedDrilldownCampaign(c)}
                  onAnalyzeCampaign={(c) => handleOpenAiDiagnosis(c.name, 'campaign', c.metrics)}
                />
              </div>
            )}

            {/* VIEW 2: LANDING PAGES (Landing Page Intelligence & Clarity) */}
            {currentTab === 'landing_pages' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <LandingPageHealthView
                  landingPages={landingPages}
                  clarityConfig={clarityConfig}
                  availableCampaigns={campaigns}
                  onRefreshClarity={handleRefreshClarity}
                  isSyncingClarity={isSyncingClarity}
                  syncNotice={claritySyncNotice}
                  onUpdateMapping={handleUpdateLandingPageMapping}
                  onOpenAiDiagnosisForLp={(lp) => {
                    setAiModalEntity({
                      name: lp.profile.name,
                      type: 'landing_page',
                      metrics: lp.metrics,
                    });
                    setIsAiModalOpen(true);
                  }}
                />
              </div>
            )}

            {/* VIEW 3: CAMPAIGNS (Table & Drilldown) */}
            {currentTab === 'campaigns' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <CampaignTable
                  campaigns={campaigns}
                  onSelectCampaign={(c) => setSelectedDrilldownCampaign(c)}
                  onAnalyzeCampaign={(c) => handleOpenAiDiagnosis(c.name, 'campaign', c.metrics)}
                />
              </div>
            )}

            {/* VIEW 4: CREATIVES (Top Performing vs Underperforming Ranking) */}
            {currentTab === 'creatives' && (
              <div className="animate-in fade-in duration-200">
                <CreativePerformanceView
                  allCreatives={allCreatives}
                  targets={targets}
                  onAnalyzeCreative={(ad) => handleOpenAiDiagnosis(ad.name, 'ad', ad.metrics)}
                />
              </div>
            )}

            {/* VIEW 5: AI ANALYSIS */}
            {currentTab === 'ai_analysis' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900">
                        Pusat Diagnosis AI & Konsultasi Meta Ads
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Dapatkan jawaban terstruktur: What Happened, Possible Cause, Evidence, Recommended Action, dan Don't Do Yet.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAiModalEntity(null);
                        setIsAiModalOpen(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      Mulai Tanya AI
                    </button>
                  </div>
                </div>

                {overviewAiDiagnosis && (
                  <AiExplanationCard analysis={overviewAiDiagnosis} />
                )}
              </div>
            )}

            {/* VIEW 6: RECOMMENDATIONS */}
            {currentTab === 'recommendations' && (
              <div className="animate-in fade-in duration-200">
                <RecommendationCenter
                  recommendations={allRecommendations}
                  onViewAiAnalysis={(item) => {
                    handleOpenAiDiagnosis(item.entityName, item.entityType, aggregatedCurrent);
                  }}
                />
              </div>
            )}

            {/* VIEW 7: ALERTS */}
            {currentTab === 'alerts' && (
              <div className="animate-in fade-in duration-200">
                <AlertSystemView
                  alerts={allAlerts}
                  onAnalyzeAlert={(alert) => {
                    handleOpenAiDiagnosis(alert.entityName, alert.entityType, aggregatedCurrent);
                  }}
                />
              </div>
            )}

            {/* VIEW 8: TARGETS */}
            {currentTab === 'targets' && (
              <div className="animate-in fade-in duration-200">
                <PerformanceTargetsView
                  targets={targets}
                  onSaveTargets={(newTargets) => setTargets(newTargets)}
                />
              </div>
            )}

            {/* VIEW 9: INTEGRATIONS */}
            {currentTab === 'integrations' && (
              <div className="animate-in fade-in duration-200">
                <MetaIntegrationView
                  config={metaConfig}
                  onUpdateConfig={(cfg) => {
                    const updated = metaAdsService.setConnectionConfig(cfg);
                    setMetaConfig(updated);
                  }}
                  onRefreshData={handleRefreshData}
                  isSyncing={isSyncing}
                  clarityConfig={clarityConfig}
                  onUpdateClarityConfig={(cfg) => {
                    const updated = clarityService.setConnectionConfig(cfg);
                    setClarityConfig(updated);
                  }}
                  onRefreshClarity={handleRefreshClarity}
                  isSyncingClarity={isSyncingClarity}
                />
              </div>
            )}

            {/* VIEW 10: SETTINGS */}
            {currentTab === 'settings' && (
              <div className="animate-in fade-in duration-200">
                <SettingsView />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        alertCount={allAlerts.length}
        recommendationCount={allRecommendations.length}
      />

      {/* Campaign Drilldown Modal */}
      {selectedDrilldownCampaign && (
        <CampaignDrilldownModal
          campaign={selectedDrilldownCampaign}
          onClose={() => setSelectedDrilldownCampaign(null)}
          onAnalyzeEntity={(name, type, metrics) => {
            handleOpenAiDiagnosis(name, type, metrics);
          }}
        />
      )}

      {/* AI Analyst Consultation Modal */}
      <AiAnalystModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        campaigns={campaigns}
        targets={targets}
        initialEntity={aiModalEntity}
        landingPages={landingPages}
        funnelDiagnosis={funnelDiagnosis}
      />
    </div>
  );
}

