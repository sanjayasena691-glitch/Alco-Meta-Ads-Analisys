import { 
  MetaAdAccount, 
  Campaign, 
  AdSet, 
  AdCreative, 
  PerformanceMetrics, 
  TimePeriod 
} from '../../types';
import { INITIAL_ACCOUNT, INITIAL_CAMPAIGNS } from '../../mock/metaData';
import { aggregateMetrics, calculateMetricsFromRaw } from '../../engine/calculations/metrics';
import { 
  MetaConnectionConfig, 
  MetaAdAccountSummary, 
  MetaApiDebugInfo, 
  MetaAdsMode,
  MetaGraphInsightsRaw
} from './metaAdsTypes';
import { metaAdsClient, normalizeAdAccountId, MetaApiError } from './metaAdsClient';
import { 
  resolveMetaDateRange, 
  assembleCampaignHierarchy 
} from './metaAdsMapper';

export { type MetaConnectionConfig };

function scaleMetrics(m: PerformanceMetrics, factor: number): PerformanceMetrics {
  const spend = Math.round(m.spend * factor);
  const revenue = Math.round(m.revenue * factor);
  const purchases = Math.max(0, Math.round(m.purchases * factor));
  const impressions = Math.round(m.impressions * factor);
  const reach = Math.max(1, Math.round(m.reach * factor));
  const clicks = Math.round(m.clicks * factor);
  const linkClicks = m.linkClicks !== undefined && m.linkClicks !== null ? Math.round(m.linkClicks * factor) : m.linkClicks;
  const outboundClicks = m.outboundClicks !== undefined && m.outboundClicks !== null ? Math.round(m.outboundClicks * factor) : m.outboundClicks;
  const landingPageViews = m.landingPageViews !== undefined && m.landingPageViews !== null ? Math.round(m.landingPageViews * factor) : m.landingPageViews;
  const addToCart = m.addToCart !== undefined && m.addToCart !== null ? Math.round(m.addToCart * factor) : m.addToCart;
  const initiateCheckout = m.initiateCheckout !== undefined && m.initiateCheckout !== null ? Math.round(m.initiateCheckout * factor) : m.initiateCheckout;

  return calculateMetricsFromRaw(
    spend,
    revenue,
    purchases,
    impressions,
    reach,
    clicks,
    {
      linkClicks,
      outboundClicks,
      landingPageViews,
      addToCart,
      initiateCheckout,
    }
  );
}

function getPeriodScaleFactor(period: TimePeriod): number {
  switch (period) {
    case 'today':
      return 0.18;
    case 'yesterday':
      return 0.20;
    case 'last_3_days':
      return 0.48;
    case 'last_7_days':
      return 1.0;
    case 'last_14_days':
      return 1.85;
    case 'last_30_days':
      return 3.6;
    default:
      return 1.0;
  }
}

export function scaleCampaignsForPeriod(campaigns: Campaign[], period: TimePeriod): Campaign[] {
  const factor = getPeriodScaleFactor(period);
  if (factor === 1.0) {
    return campaigns;
  }

  return campaigns.map((c) => ({
    ...c,
    metrics: scaleMetrics(c.metrics, factor),
    previousMetrics: scaleMetrics(c.previousMetrics, factor),
    adSets: c.adSets.map((as) => ({
      ...as,
      metrics: scaleMetrics(as.metrics, factor),
      previousMetrics: scaleMetrics(as.previousMetrics, factor),
      ads: as.ads.map((ad) => ({
        ...ad,
        metrics: scaleMetrics(ad.metrics, factor),
        previousMetrics: scaleMetrics(ad.previousMetrics, factor),
      })),
    })),
  }));
}

class MetaAdsService {
  private currentMockAccount: MetaAdAccount = INITIAL_ACCOUNT;
  private connectionConfig: MetaConnectionConfig = {
    mode: 'mock',
    selectedAdAccountId: INITIAL_ACCOUNT.id,
    selectedAdAccountName: INITIAL_ACCOUNT.name,
    selectedAdAccountCurrency: INITIAL_ACCOUNT.currency,
    selectedAdAccountTimezone: INITIAL_ACCOUNT.timezone,
    lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    syncStatus: 'SUCCESS',
  };

  // Cached Real API Data Snapshot
  private realDataSnapshot: {
    campaigns: Campaign[];
    currentMetrics: PerformanceMetrics;
    previousMetrics: PerformanceMetrics;
    period: TimePeriod;
    lastSyncedAt: string;
  } | null = null;

  // Debug Diagnostics
  private debugInfo: MetaApiDebugInfo | null = null;

  public getConnectionConfig(): MetaConnectionConfig {
    return { ...this.connectionConfig };
  }

  public setConnectionConfig(config: Partial<MetaConnectionConfig>): MetaConnectionConfig {
    this.connectionConfig = {
      ...this.connectionConfig,
      ...config,
    };
    return { ...this.connectionConfig };
  }

  public getDebugInfo(): MetaApiDebugInfo | null {
    return this.debugInfo;
  }

  /**
   * Tests connection validity with token.
   */
  public async testConnection(token?: string): Promise<{ success: boolean; message: string; user?: any }> {
    const activeToken = token || this.connectionConfig.accessToken;
    if (!activeToken || !activeToken.trim()) {
      return {
        success: false,
        message: 'Access Token belum dimasukkan.',
      };
    }

    try {
      const user = await metaAdsClient.testConnection(activeToken);
      return {
        success: true,
        message: `Terhubung sebagai ${user.name} (ID: ${user.id})`,
        user,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Gagal terhubung ke Meta Graph API.',
      };
    }
  }

  /**
   * Fetches accessible Ad Accounts.
   */
  public async getAdAccounts(): Promise<MetaAdAccountSummary[]> {
    if (this.connectionConfig.mode === 'mock') {
      return [
        {
          id: this.currentMockAccount.id,
          accountId: this.currentMockAccount.id.replace(/^act_/, ''),
          name: this.currentMockAccount.name,
          currency: this.currentMockAccount.currency,
          timezone: this.currentMockAccount.timezone,
          accountStatus: 1,
          businessName: 'ALCO Media Group',
        },
        {
          id: 'act_19283940192',
          accountId: '19283940192',
          name: 'ALCO Fashion Store (Staging)',
          currency: 'IDR',
          timezone: 'Asia/Jakarta',
          accountStatus: 1,
          businessName: 'ALCO Retail ID',
        },
      ];
    }

    const token = this.connectionConfig.accessToken;
    if (!token) {
      throw new Error('Meta access token belum dikonfigurasi.');
    }

    return metaAdsClient.getAdAccounts(token);
  }

  /**
   * Selects an Ad Account for analysis.
   */
  public selectAdAccount(account: MetaAdAccountSummary): void {
    this.connectionConfig.selectedAdAccountId = account.id;
    this.connectionConfig.selectedAdAccountName = account.name;
    this.connectionConfig.selectedAdAccountCurrency = account.currency;
    this.connectionConfig.selectedAdAccountTimezone = account.timezone;
    this.realDataSnapshot = null; // Invalidate cache for new account
  }

  /**
   * Disconnects Meta account.
   */
  public disconnect(): void {
    this.connectionConfig = {
      mode: 'mock',
      accessToken: undefined,
      selectedAdAccountId: this.currentMockAccount.id,
      selectedAdAccountName: this.currentMockAccount.name,
      selectedAdAccountCurrency: this.currentMockAccount.currency,
      selectedAdAccountTimezone: this.currentMockAccount.timezone,
      lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      syncStatus: 'IDLE',
      errorMessage: undefined,
    };
    this.realDataSnapshot = null;
    this.debugInfo = null;
  }

  /**
   * Fetches campaign list.
   */
  public async getCampaigns(period: TimePeriod = 'last_7_days'): Promise<Campaign[]> {
    const insights = await this.getInsights(period);
    return insights.campaigns;
  }

  /**
   * Fetches ad set list.
   */
  public async getAdSets(campaignId?: string, period: TimePeriod = 'last_7_days'): Promise<AdSet[]> {
    const campaigns = await this.getCampaigns(period);
    const allAdSets = campaigns.flatMap((c) => c.adSets);
    if (campaignId) {
      return allAdSets.filter((a) => a.campaignId === campaignId);
    }
    return allAdSets;
  }

  /**
   * Fetches ads list.
   */
  public async getAds(adSetId?: string, period: TimePeriod = 'last_7_days'): Promise<AdCreative[]> {
    const campaigns = await this.getCampaigns(period);
    const allAds = campaigns.flatMap((c) => c.adSets.flatMap((as) => as.ads));
    if (adSetId) {
      return allAds.filter((ad) => ad.adSetId === adSetId);
    }
    return allAds;
  }

  /**
   * Core Insights Engine across Mock and Real Mode.
   */
  public async getInsights(period: TimePeriod = 'last_7_days'): Promise<{
    current: PerformanceMetrics;
    previous: PerformanceMetrics;
    campaigns: Campaign[];
    currency: string;
    timezone: string;
    isRealMode: boolean;
  }> {
    // 1. MOCK MODE
    if (this.connectionConfig.mode === 'mock') {
      const scaledCampaigns = scaleCampaignsForPeriod(this.currentMockAccount.campaigns, period);
      const currentList = scaledCampaigns.map((c) => c.metrics);
      const previousList = scaledCampaigns.map((c) => c.previousMetrics);

      return {
        current: aggregateMetrics(currentList),
        previous: aggregateMetrics(previousList),
        campaigns: scaledCampaigns,
        currency: this.currentMockAccount.currency || 'IDR',
        timezone: this.currentMockAccount.timezone || 'Asia/Jakarta',
        isRealMode: false,
      };
    }

    // 2. REAL MODE - Check Credentials
    const token = this.connectionConfig.accessToken;
    const accountId = this.connectionConfig.selectedAdAccountId;

    if (!token || !token.trim() || !accountId) {
      this.connectionConfig.syncStatus = 'ERROR';
      this.connectionConfig.errorMessage = 'Meta Ads belum terhubung. Silakan masukkan Access Token dan pilih Ad Account.';
      throw new Error(this.connectionConfig.errorMessage);
    }

    // Return cached snapshot if fresh for same period
    if (this.realDataSnapshot && this.realDataSnapshot.period === period) {
      return {
        current: this.realDataSnapshot.currentMetrics,
        previous: this.realDataSnapshot.previousMetrics,
        campaigns: this.realDataSnapshot.campaigns,
        currency: this.connectionConfig.selectedAdAccountCurrency || 'IDR',
        timezone: this.connectionConfig.selectedAdAccountTimezone || 'Asia/Jakarta',
        isRealMode: true,
      };
    }

    // Execute Real Graph API Sync
    return this.executeRealSync(accountId, token, period);
  }

  /**
   * Refreshes insights from Meta Marketing API or updates Mock snapshot.
   */
  public async refreshInsights(period: TimePeriod = 'last_7_days'): Promise<{
    lastSyncedAt: string;
    campaigns: Campaign[];
    current: PerformanceMetrics;
    previous: PerformanceMetrics;
    currency: string;
    timezone: string;
    syncStatus: 'SUCCESS' | 'ERROR' | 'REAUTH_REQUIRED';
    errorMessage?: string;
  }> {
    this.connectionConfig.syncStatus = 'SYNCING';
    const nowFormatted = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    try {
      if (this.connectionConfig.mode === 'mock') {
        await new Promise((resolve) => setTimeout(resolve, 350));
        const scaledCampaigns = scaleCampaignsForPeriod(this.currentMockAccount.campaigns, period);
        const currentList = scaledCampaigns.map((c) => c.metrics);
        const previousList = scaledCampaigns.map((c) => c.previousMetrics);

        this.connectionConfig.lastSyncedAt = nowFormatted;
        this.connectionConfig.syncStatus = 'SUCCESS';
        this.connectionConfig.errorMessage = undefined;

        return {
          lastSyncedAt: nowFormatted,
          campaigns: scaledCampaigns,
          current: aggregateMetrics(currentList),
          previous: aggregateMetrics(previousList),
          currency: this.currentMockAccount.currency || 'IDR',
          timezone: this.currentMockAccount.timezone || 'Asia/Jakarta',
          syncStatus: 'SUCCESS',
        };
      }

      // Real Sync
      const token = this.connectionConfig.accessToken;
      const accountId = this.connectionConfig.selectedAdAccountId;

      if (!token || !accountId) {
        throw new Error('Access Token atau Ad Account belum ditentukan.');
      }

      const res = await this.executeRealSync(accountId, token, period);
      this.connectionConfig.lastSyncedAt = nowFormatted;
      this.connectionConfig.syncStatus = 'SUCCESS';
      this.connectionConfig.errorMessage = undefined;

      return {
        lastSyncedAt: nowFormatted,
        campaigns: res.campaigns,
        current: res.current,
        previous: res.previous,
        currency: res.currency,
        timezone: res.timezone,
        syncStatus: 'SUCCESS',
      };
    } catch (err: any) {
      const isAuth = err instanceof MetaApiError && err.isAuthError;
      this.connectionConfig.syncStatus = isAuth ? 'REAUTH_REQUIRED' : 'ERROR';
      this.connectionConfig.errorMessage = err.message || 'Gagal menyinkronkan data Meta Ads.';

      return {
        lastSyncedAt: this.connectionConfig.lastSyncedAt || nowFormatted,
        campaigns: this.realDataSnapshot?.campaigns || [],
        current: this.realDataSnapshot?.currentMetrics || {
          spend: 0, revenue: 0, purchases: 0, impressions: 0, reach: 0, clicks: 0, frequency: 1, roas: 0, cpa: 0, ctr: 0, cpc: 0, cpm: 0
        },
        previous: this.realDataSnapshot?.previousMetrics || {
          spend: 0, revenue: 0, purchases: 0, impressions: 0, reach: 0, clicks: 0, frequency: 1, roas: 0, cpa: 0, ctr: 0, cpc: 0, cpm: 0
        },
        currency: this.connectionConfig.selectedAdAccountCurrency || 'IDR',
        timezone: this.connectionConfig.selectedAdAccountTimezone || 'Asia/Jakarta',
        syncStatus: isAuth ? 'REAUTH_REQUIRED' : 'ERROR',
        errorMessage: err.message,
      };
    }
  }

  /**
   * Internal worker to execute real Meta Graph API sync and mapping.
   */
  private async executeRealSync(
    accountId: string,
    token: string,
    period: TimePeriod
  ): Promise<{
    current: PerformanceMetrics;
    previous: PerformanceMetrics;
    campaigns: Campaign[];
    currency: string;
    timezone: string;
    isRealMode: boolean;
  }> {
    const normAccountId = normalizeAdAccountId(accountId);
    const dateRanges = resolveMetaDateRange(period);

    // 1. Fetch Entities in Parallel
    const [rawCampaigns, rawAdSets, rawAds] = await Promise.all([
      metaAdsClient.getCampaigns(normAccountId, token),
      metaAdsClient.getAdSets(normAccountId, token),
      metaAdsClient.getAds(normAccountId, token),
    ]);

    // 2. Fetch Insights in Parallel (Current & Previous for Campaigns, AdSets, Ads)
    const [
      campInsightsCurr,
      campInsightsPrev,
      adsetInsightsCurr,
      adsetInsightsPrev,
      adInsightsCurr,
      adInsightsPrev,
    ] = await Promise.all([
      metaAdsClient.getInsights(normAccountId, token, { level: 'campaign', dateRange: dateRanges.current }),
      metaAdsClient.getInsights(normAccountId, token, { level: 'campaign', dateRange: dateRanges.previous }),
      metaAdsClient.getInsights(normAccountId, token, { level: 'adset', dateRange: dateRanges.current }),
      metaAdsClient.getInsights(normAccountId, token, { level: 'adset', dateRange: dateRanges.previous }),
      metaAdsClient.getInsights(normAccountId, token, { level: 'ad', dateRange: dateRanges.current }),
      metaAdsClient.getInsights(normAccountId, token, { level: 'ad', dateRange: dateRanges.previous }),
    ]);

    // 3. Build Index Maps
    const currentCampaignInsights = new Map<string, MetaGraphInsightsRaw>();
    campInsightsCurr.forEach((i) => { if (i.campaign_id) currentCampaignInsights.set(i.campaign_id, i); });

    const previousCampaignInsights = new Map<string, MetaGraphInsightsRaw>();
    campInsightsPrev.forEach((i) => { if (i.campaign_id) previousCampaignInsights.set(i.campaign_id, i); });

    const currentAdSetInsights = new Map<string, MetaGraphInsightsRaw>();
    adsetInsightsCurr.forEach((i) => { if (i.adset_id) currentAdSetInsights.set(i.adset_id, i); });

    const previousAdSetInsights = new Map<string, MetaGraphInsightsRaw>();
    adsetInsightsPrev.forEach((i) => { if (i.adset_id) previousAdSetInsights.set(i.adset_id, i); });

    const currentAdInsights = new Map<string, MetaGraphInsightsRaw>();
    adInsightsCurr.forEach((i) => { if (i.ad_id) currentAdInsights.set(i.ad_id, i); });

    const previousAdInsights = new Map<string, MetaGraphInsightsRaw>();
    adInsightsPrev.forEach((i) => { if (i.ad_id) previousAdInsights.set(i.ad_id, i); });

    // 4. Assemble Domain Hierarchy
    const mappedCampaigns = assembleCampaignHierarchy({
      rawCampaigns,
      rawAdSets,
      rawAds,
      currentCampaignInsights,
      previousCampaignInsights,
      currentAdSetInsights,
      previousAdSetInsights,
      currentAdInsights,
      previousAdInsights,
    });

    const currentMetricsList = mappedCampaigns.map((c) => c.metrics);
    const previousMetricsList = mappedCampaigns.map((c) => c.previousMetrics);

    const aggregatedCurrent = aggregateMetrics(currentMetricsList);
    const aggregatedPrevious = aggregateMetrics(previousMetricsList);
    const nowFormatted = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // 5. Update Snapshot
    this.realDataSnapshot = {
      campaigns: mappedCampaigns,
      currentMetrics: aggregatedCurrent,
      previousMetrics: aggregatedPrevious,
      period,
      lastSyncedAt: nowFormatted,
    };

    // 6. Record Diagnostics
    this.debugInfo = {
      mode: 'real',
      lastRequestLevel: 'campaign',
      period,
      dateRange: dateRanges,
      adAccountId: normAccountId,
      entityCount: {
        campaigns: rawCampaigns.length,
        adSets: rawAdSets.length,
        ads: rawAds.length,
      },
      insightsCount: campInsightsCurr.length + adsetInsightsCurr.length + adInsightsCurr.length,
      missingFields: [],
    };

    return {
      current: aggregatedCurrent,
      previous: aggregatedPrevious,
      campaigns: mappedCampaigns,
      currency: this.connectionConfig.selectedAdAccountCurrency || 'IDR',
      timezone: this.connectionConfig.selectedAdAccountTimezone || 'Asia/Jakarta',
      isRealMode: true,
    };
  }
}

export const metaAdsService = new MetaAdsService();
