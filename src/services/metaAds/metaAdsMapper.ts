import { 
  Campaign, 
  AdSet, 
  AdCreative, 
  PerformanceMetrics, 
  TimePeriod,
  EntityStatus
} from '../../types';
import { 
  MetaGraphCampaignRaw, 
  MetaGraphAdSetRaw, 
  MetaGraphAdRaw, 
  MetaGraphInsightsRaw, 
  MetaGraphActionItem,
  MetaDateRange
} from './metaAdsTypes';

/**
 * Safely parses any value to number or returns null.
 * Strictly prevents NaN or Infinity.
 */
export function parseNullableNumber(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return null;
  return num;
}

/**
 * Maps Meta action arrays to specific metric values.
 * Returns null if the action type was not measured by Meta (UNKNOWN !== ZERO).
 */
export function getActionValue(actions?: MetaGraphActionItem[], actionTypes: string[] = []): number | null {
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return null;
  }

  const match = actions.find((item) => 
    actionTypes.some((type) => item.action_type.toLowerCase() === type.toLowerCase())
  );

  if (!match) return null;
  return parseNullableNumber(match.value);
}

/**
 * Standard Meta Conversion Event Type Candidates
 */
export const ACTION_TYPES = {
  LINK_CLICKS: ['link_click', 'outbound_click'],
  OUTBOUND_CLICKS: ['outbound_click'],
  LANDING_PAGE_VIEWS: ['landing_page_view', 'omni_landing_page_view', 'landing_page_views'],
  ADD_TO_CART: ['add_to_cart', 'omni_add_to_cart'],
  INITIATE_CHECKOUT: ['initiate_checkout', 'omni_initiated_checkout', 'initiate_checkout_total'],
  PURCHASES: ['purchase', 'omni_purchase'],
};

/**
 * Converts TimePeriod to deterministic Meta API Date Ranges (Current vs Previous).
 * Guarantees NO OVERLAP between current and previous periods.
 */
export function resolveMetaDateRange(period: TimePeriod = 'last_7_days'): {
  current: MetaDateRange;
  previous: MetaDateRange;
} {
  const now = new Date();
  
  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addDays = (base: Date, days: number): Date => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  };

  const todayStr = formatDate(now);
  const yesterdayStr = formatDate(addDays(now, -1));

  switch (period) {
    case 'today':
      return {
        current: { since: todayStr, until: todayStr },
        previous: { since: yesterdayStr, until: yesterdayStr },
      };

    case 'yesterday':
      return {
        current: { since: yesterdayStr, until: yesterdayStr },
        previous: { since: formatDate(addDays(now, -2)), until: formatDate(addDays(now, -2)) },
      };

    case 'last_3_days':
      return {
        current: { since: formatDate(addDays(now, -3)), until: yesterdayStr },
        previous: { since: formatDate(addDays(now, -6)), until: formatDate(addDays(now, -4)) },
      };

    case 'last_7_days':
      return {
        current: { since: formatDate(addDays(now, -7)), until: yesterdayStr },
        previous: { since: formatDate(addDays(now, -14)), until: formatDate(addDays(now, -8)) },
      };

    case 'last_14_days':
      return {
        current: { since: formatDate(addDays(now, -14)), until: yesterdayStr },
        previous: { since: formatDate(addDays(now, -28)), until: formatDate(addDays(now, -15)) },
      };

    case 'last_30_days':
      return {
        current: { since: formatDate(addDays(now, -30)), until: yesterdayStr },
        previous: { since: formatDate(addDays(now, -60)), until: formatDate(addDays(now, -31)) },
      };

    default:
      return {
        current: { since: formatDate(addDays(now, -7)), until: yesterdayStr },
        previous: { since: formatDate(addDays(now, -14)), until: formatDate(addDays(now, -8)) },
      };
  }
}

/**
 * Maps raw Meta Graph API Insights into ALCO PerformanceMetrics.
 * Adheres strictly to Zero-Fabrication: missing action items or unmeasured metrics remain null.
 */
export function createUnknownPerformanceMetrics(): PerformanceMetrics {
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
    linkClicks: null,
    outboundClicks: null,
    landingPageViews: null,
    addToCart: null,
    initiateCheckout: null,
    dataAvailability: 'UNAVAILABLE',
  };
}

export function mapMetaInsightsToPerformanceMetrics(insight?: MetaGraphInsightsRaw): PerformanceMetrics {
  if (!insight || Object.keys(insight).length === 0) {
    return createUnknownPerformanceMetrics();
  }

  const spend = parseNullableNumber(insight.spend);
  const impressions = parseNullableNumber(insight.impressions);
  const reach = parseNullableNumber(insight.reach);
  const clicks = parseNullableNumber(insight.clicks);

  // Actions extraction (null if unmeasured by Meta)
  const purchases = getActionValue(insight.actions, ACTION_TYPES.PURCHASES);
  const revenue = getActionValue(insight.action_values, ACTION_TYPES.PURCHASES);
  const linkClicks = getActionValue(insight.actions, ACTION_TYPES.LINK_CLICKS);
  const outboundClicks = getActionValue(insight.actions, ACTION_TYPES.OUTBOUND_CLICKS);
  const landingPageViews = getActionValue(insight.actions, ACTION_TYPES.LANDING_PAGE_VIEWS);
  const addToCart = getActionValue(insight.actions, ACTION_TYPES.ADD_TO_CART);
  const initiateCheckout = getActionValue(insight.actions, ACTION_TYPES.INITIATE_CHECKOUT);

  // Deterministic Derived calculations (Strict Zero-Fabrication Rules)
  // CPA: only when purchases > 0 and spend is known (NEVER fallback to spend!)
  let cpa: number | null = null;
  if (purchases !== null && purchases > 0 && spend !== null && spend >= 0) {
    cpa = Math.round(spend / purchases);
  }

  // ROAS: only when spend > 0 and revenue is known
  let roas: number | null = null;
  if (revenue !== null && spend !== null && spend > 0) {
    roas = Number((revenue / spend).toFixed(2));
  } else if (revenue !== null && spend !== null && spend === 0 && revenue === 0) {
    roas = 0;
  }

  // CTR: clicks / impressions * 100
  let ctr: number | null = null;
  if (clicks !== null && impressions !== null && impressions > 0) {
    ctr = Number(((clicks / impressions) * 100).toFixed(2));
  } else {
    ctr = parseNullableNumber(insight.ctr);
  }

  // CPC: spend / clicks
  let cpc: number | null = null;
  if (spend !== null && clicks !== null && clicks > 0) {
    cpc = Math.round(spend / clicks);
  } else {
    cpc = parseNullableNumber(insight.cpc);
  }

  // CPM: spend / impressions * 1000
  let cpm: number | null = null;
  if (spend !== null && impressions !== null && impressions > 0) {
    cpm = Math.round((spend / impressions) * 1000);
  } else {
    cpm = parseNullableNumber(insight.cpm);
  }

  // Frequency: impressions / reach (No ": 1" fallback!)
  let frequency: number | null = null;
  const rawFreq = parseNullableNumber(insight.frequency);
  if (rawFreq !== null) {
    frequency = rawFreq;
  } else if (impressions !== null && reach !== null && reach > 0) {
    frequency = Number((impressions / reach).toFixed(2));
  }

  const hasAnyPrimaryField = spend !== null || impressions !== null || reach !== null || clicks !== null;
  const dataAvailability = 
    (spend !== null && impressions !== null && clicks !== null) 
      ? 'AVAILABLE' 
      : hasAnyPrimaryField 
      ? 'PARTIAL' 
      : 'UNAVAILABLE';

  return {
    spend,
    revenue,
    purchases,
    impressions,
    reach,
    clicks,
    frequency,
    roas,
    cpa,
    ctr,
    cpc,
    cpm,
    linkClicks,
    outboundClicks,
    landingPageViews,
    addToCart,
    initiateCheckout,
    dataAvailability,
  };
}

/**
 * Maps Meta status string (e.g. ACTIVE, PAUSED, ARCHIVED) to ALCO EntityStatus.
 */
export function mapMetaStatusToEntityStatus(status?: string, effectiveStatus?: string): EntityStatus {
  const stat = (effectiveStatus || status || '').toUpperCase();
  if (stat === 'ACTIVE') return 'HEALTHY';
  if (stat === 'PAUSED') return 'MONITOR';
  if (stat === 'ARCHIVED' || stat === 'DELETED') return 'MONITOR';
  return 'MONITOR';
}

/**
 * Maps creative metadata to ALCO CreativeFormat.
 * Adheres strictly to Zero-Fabrication: returns 'UNKNOWN' if format cannot be deterministically inferred.
 */
export function inferCreativeFormat(creative?: MetaGraphAdRaw['creative']): 'Video' | 'Image' | 'Carousel' | 'Collection' | 'UNKNOWN' {
  if (!creative) return 'UNKNOWN';
  // Check explicit properties if present
  if ((creative as any).object_story_spec?.link_data?.child_attachments) {
    return 'Carousel';
  }
  if ((creative as any).video_id || (creative as any).video_data) {
    return 'Video';
  }
  if ((creative as any).image_hash || (creative as any).image_url) {
    return 'Image';
  }
  return 'UNKNOWN';
}

/**
 * Assembles complete ALCO Campaign hierarchy from raw Meta API lists and insights maps.
 */
export function assembleCampaignHierarchy(params: {
  rawCampaigns: MetaGraphCampaignRaw[];
  rawAdSets: MetaGraphAdSetRaw[];
  rawAds: MetaGraphAdRaw[];
  currentCampaignInsights: Map<string, MetaGraphInsightsRaw>;
  previousCampaignInsights: Map<string, MetaGraphInsightsRaw>;
  currentAdSetInsights: Map<string, MetaGraphInsightsRaw>;
  previousAdSetInsights: Map<string, MetaGraphInsightsRaw>;
  currentAdInsights: Map<string, MetaGraphInsightsRaw>;
  previousAdInsights: Map<string, MetaGraphInsightsRaw>;
}): Campaign[] {
  const {
    rawCampaigns,
    rawAdSets,
    rawAds,
    currentCampaignInsights,
    previousCampaignInsights,
    currentAdSetInsights,
    previousAdSetInsights,
    currentAdInsights,
    previousAdInsights,
  } = params;

  return rawCampaigns.map((camp) => {
    const campCurrentMetrics = mapMetaInsightsToPerformanceMetrics(currentCampaignInsights.get(camp.id));
    const campPrevMetrics = mapMetaInsightsToPerformanceMetrics(previousCampaignInsights.get(camp.id));
    
    // Budget parsing: Meta API returns budgets in minor units (e.g. cents / sen)
    const rawCampDaily = parseNullableNumber(camp.daily_budget);
    const rawCampLifetime = parseNullableNumber(camp.lifetime_budget);
    
    const campDailyBudget = rawCampDaily !== null && rawCampDaily > 0 ? Math.round(rawCampDaily / 100) : null;
    const campLifetimeBudget = rawCampLifetime !== null && rawCampLifetime > 0 ? Math.round(rawCampLifetime / 100) : null;
    const campBudgetType = campDailyBudget !== null ? 'DAILY' : campLifetimeBudget !== null ? 'LIFETIME' : 'UNKNOWN';

    // Filter ad sets for this campaign
    const relatedAdSets = rawAdSets.filter((as) => as.campaign_id === camp.id);

    const adSets: AdSet[] = relatedAdSets.map((as) => {
      const asCurrentMetrics = mapMetaInsightsToPerformanceMetrics(currentAdSetInsights.get(as.id));
      const asPrevMetrics = mapMetaInsightsToPerformanceMetrics(previousAdSetInsights.get(as.id));
      
      const rawAsDaily = parseNullableNumber(as.daily_budget);
      const rawAsLifetime = parseNullableNumber(as.lifetime_budget);
      
      const asDailyBudget = rawAsDaily !== null && rawAsDaily > 0 ? Math.round(rawAsDaily / 100) : null;
      const asLifetimeBudget = rawAsLifetime !== null && rawAsLifetime > 0 ? Math.round(rawAsLifetime / 100) : null;
      
      const asBudgetType = asDailyBudget !== null 
        ? 'DAILY' 
        : asLifetimeBudget !== null 
        ? 'LIFETIME' 
        : (campDailyBudget !== null || campLifetimeBudget !== null)
        ? 'CAMPAIGN_LEVEL'
        : 'UNKNOWN';

      // Filter ads for this adset
      const relatedAds = rawAds.filter((ad) => ad.adset_id === as.id);

      const ads: AdCreative[] = relatedAds.map((ad) => {
        const adCurrentMetrics = mapMetaInsightsToPerformanceMetrics(currentAdInsights.get(ad.id));
        const adPrevMetrics = mapMetaInsightsToPerformanceMetrics(previousAdInsights.get(ad.id));

        return {
          id: ad.id,
          adSetId: as.id,
          campaignId: camp.id,
          name: ad.name || `Ad ${ad.id}`,
          format: inferCreativeFormat(ad.creative),
          thumbnailUrl: ad.creative?.thumbnail_url || ad.creative?.image_url,
          hookText: ad.creative?.title || ad.creative?.body?.slice(0, 60) || `Creative #${ad.id}`,
          status: mapMetaStatusToEntityStatus(ad.status, ad.effective_status),
          metrics: adCurrentMetrics,
          previousMetrics: adPrevMetrics,
        };
      });

      return {
        id: as.id,
        campaignId: camp.id,
        name: as.name || `AdSet ${as.id}`,
        targetingSummary: as.targeting?.geo_locations?.countries?.join(', ') || 'Advantage+ Audience',
        dailyBudget: asDailyBudget,
        lifetimeBudget: asLifetimeBudget,
        budgetType: asBudgetType,
        status: mapMetaStatusToEntityStatus(as.status, as.effective_status),
        metrics: asCurrentMetrics,
        previousMetrics: asPrevMetrics,
        ads,
      };
    });

    return {
      id: camp.id,
      name: camp.name || `Campaign ${camp.id}`,
      objective: camp.objective || 'OUTCOME_SALES',
      dailyBudget: campDailyBudget,
      lifetimeBudget: campLifetimeBudget,
      budgetType: campBudgetType,
      status: mapMetaStatusToEntityStatus(camp.status, camp.effective_status),
      metrics: campCurrentMetrics,
      previousMetrics: campPrevMetrics,
      adSets,
    };
  });
}
