import { 
  PerformanceMetrics, 
  PeriodMetricsSummary, 
  MetricWithComparison,
  BusinessTargets,
  AdCreative 
} from '../../types';
import { calculatePercentChange } from '../../utils/formatters';
export { calculatePercentChange };

export function calculateMetricsFromRaw(
  spend: number | null,
  revenue: number | null,
  purchases: number | null,
  impressions: number | null,
  reach: number | null,
  clicks: number | null,
  funnel?: {
    linkClicks?: number | null;
    outboundClicks?: number | null;
    landingPageViews?: number | null;
    addToCart?: number | null;
    initiateCheckout?: number | null;
  }
): PerformanceMetrics {
  let roas: number | null = null;
  if (revenue !== null && spend !== null && spend > 0) {
    roas = Number((revenue / spend).toFixed(2));
  } else if (revenue !== null && spend !== null && spend === 0 && revenue === 0) {
    roas = 0;
  }

  let cpa: number | null = null;
  if (purchases !== null && purchases > 0 && spend !== null && spend >= 0) {
    cpa = Math.round(spend / purchases);
  }

  let ctr: number | null = null;
  if (clicks !== null && impressions !== null && impressions > 0) {
    ctr = Number(((clicks / impressions) * 100).toFixed(2));
  }

  let cpc: number | null = null;
  if (spend !== null && clicks !== null && clicks > 0) {
    cpc = Math.round(spend / clicks);
  }

  let cpm: number | null = null;
  if (spend !== null && impressions !== null && impressions > 0) {
    cpm = Math.round((spend / impressions) * 1000);
  }

  let frequency: number | null = null;
  if (impressions !== null && reach !== null && reach > 0) {
    frequency = Number((impressions / reach).toFixed(2));
  }

  const hasAny = spend !== null || impressions !== null || reach !== null || clicks !== null;
  const dataAvailability = (spend !== null && impressions !== null && clicks !== null)
    ? 'AVAILABLE'
    : hasAny
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
    linkClicks: funnel?.linkClicks ?? null,
    outboundClicks: funnel?.outboundClicks ?? null,
    landingPageViews: funnel?.landingPageViews ?? null,
    addToCart: funnel?.addToCart ?? null,
    initiateCheckout: funnel?.initiateCheckout ?? null,
    dataAvailability,
  };
}

export function aggregateMetrics(metricsList: PerformanceMetrics[]): PerformanceMetrics {
  if (!metricsList || metricsList.length === 0) {
    return calculateMetricsFromRaw(null, null, null, null, null, null);
  }

  const sumNullable = (key: keyof PerformanceMetrics): number | null => {
    const valid = metricsList
      .map((m) => m[key])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (valid.length === 0) return null;
    return valid.reduce((acc, val) => acc + val, 0);
  };

  const totalSpend = sumNullable('spend');
  const totalRevenue = sumNullable('revenue');
  const totalPurchases = sumNullable('purchases');
  const totalImpressions = sumNullable('impressions');
  const totalReach = sumNullable('reach');
  const totalClicks = sumNullable('clicks');

  const totalLinkClicks = sumNullable('linkClicks');
  const totalLpViews = sumNullable('landingPageViews');
  const totalAddToCart = sumNullable('addToCart');
  const totalCheckout = sumNullable('initiateCheckout');

  return calculateMetricsFromRaw(
    totalSpend,
    totalRevenue,
    totalPurchases,
    totalImpressions,
    totalReach,
    totalClicks,
    {
      linkClicks: totalLinkClicks,
      landingPageViews: totalLpViews,
      addToCart: totalAddToCart,
      initiateCheckout: totalCheckout,
    }
  );
}

/**
 * Generic Safe Rate Calculator
 * Returns percentage (0 - 100) rounded to 1 decimal place, or null if denominator is invalid/zero.
 * Guaranteed safe against divide by zero, NaN, and Infinity.
 */
export function calculateSafeRate(numerator?: number | null, denominator?: number | null): number | null {
  if (
    numerator === undefined ||
    numerator === null ||
    !Number.isFinite(numerator) ||
    denominator === undefined ||
    denominator === null ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null;
  }
  const res = (numerator / denominator) * 100;
  if (!Number.isFinite(res)) return null;
  return Number(res.toFixed(1));
}

/**
 * Normalized Landing Page Behavior Rate Helpers
 */
export function calculateRageClickRate(rageClicks?: number | null, sessions?: number | null): number | null {
  return calculateSafeRate(rageClicks, sessions);
}

export function calculateDeadClickRate(deadClicks?: number | null, sessions?: number | null): number | null {
  return calculateSafeRate(deadClicks, sessions);
}

export function calculateQuickBackRate(quickBacks?: number | null, sessions?: number | null): number | null {
  return calculateSafeRate(quickBacks, sessions);
}

export function calculateCtaClickRate(ctaClicks?: number | null, sessions?: number | null): number | null {
  return calculateSafeRate(ctaClicks, sessions);
}

export function calculateCheckoutRate(checkoutStarts?: number | null, sessions?: number | null): number | null {
  return calculateSafeRate(checkoutStarts, sessions);
}

export function calculatePurchaseRate(purchases?: number | null, checkoutStarts?: number | null): number | null {
  return calculateSafeRate(purchases, checkoutStarts);
}

export function calculateLpViewRate(landingPageViews?: number | null, linkClicks?: number | null): number | null {
  return calculateSafeRate(landingPageViews, linkClicks);
}

export function calculateEngagementRate(engagedVisitors?: number | null, sessions?: number | null): number | null {
  return calculateSafeRate(engagedVisitors, sessions);
}

/**
 * Funnel calculation helpers (Safe against division by zero and null-safe)
 */
export function calculateLinkClickToLpViewRate(landingPageViews?: number | null, linkClicks?: number | null): number | null {
  return calculateLpViewRate(landingPageViews, linkClicks);
}

export function calculateLpViewToCheckoutRate(checkoutStarts?: number | null, landingPageViews?: number | null): number | null {
  return calculateSafeRate(checkoutStarts, landingPageViews);
}

export function calculateLpViewToPurchaseRate(purchases?: number | null, landingPageViews?: number | null): number | null {
  return calculateSafeRate(purchases, landingPageViews);
}

export function calculateCheckoutToPurchaseRate(purchases?: number | null, checkoutStarts?: number | null): number | null {
  return calculatePurchaseRate(purchases, checkoutStarts);
}


export function buildMetricWithComparison(
  current: number | null,
  previous: number | null,
  label: string,
  higherIsBetter: boolean
): MetricWithComparison {
  const percentChange = calculatePercentChange(current, previous);
  const isPositiveChange = percentChange === null 
    ? null 
    : higherIsBetter 
    ? percentChange >= 0 
    : percentChange <= 0;

  return {
    current,
    previous,
    percentChange,
    isPositiveChange,
    label,
  };
}

export function computePeriodSummary(
  current: PerformanceMetrics,
  previous: PerformanceMetrics
): PeriodMetricsSummary {
  return {
    spend: buildMetricWithComparison(current.spend, previous.spend, 'Spend', false),
    revenue: buildMetricWithComparison(current.revenue, previous.revenue, 'Revenue', true),
    purchases: buildMetricWithComparison(current.purchases, previous.purchases, 'Purchases', true),
    roas: buildMetricWithComparison(current.roas, previous.roas, 'ROAS', true),
    cpa: buildMetricWithComparison(current.cpa, previous.cpa, 'CPA', false),
    ctr: buildMetricWithComparison(current.ctr, previous.ctr, 'CTR', true),
    cpc: buildMetricWithComparison(current.cpc, previous.cpc, 'CPC', false),
    cpm: buildMetricWithComparison(current.cpm, previous.cpm, 'CPM', false),
    frequency: buildMetricWithComparison(current.frequency, previous.frequency, 'Frequency', false),
  };
}

export const calculatePeriodMetricsSummary = (
  current: PerformanceMetrics,
  previous: PerformanceMetrics,
  _targets?: BusinessTargets
): PeriodMetricsSummary => computePeriodSummary(current, previous);

/**
 * Composite Creative Scoring Algorithm
 * Rank based on combination of:
 * - ROAS weight: 35%
 * - CPA efficiency (relative to target CPA): 30%
 * - CTR (Audience engagement): 15%
 * - Purchase volume: 10%
 * - Spend qualification threshold: 10%
 * Never determines winner only by CTR!
 */
export function calculateCreativeCompositeScore(
  ad: AdCreative,
  targets: BusinessTargets
): number {
  const m = ad.metrics;

  // If core metrics are unavailable or missing
  if (m.spend === null || m.impressions === null) {
    return 30; // Unknown baseline
  }

  const spend = m.spend;
  const purchases = m.purchases ?? 0;
  const roas = m.roas ?? 0;
  const ctr = m.ctr ?? 0;
  const cpa = m.cpa;

  // Insufficient data protection: If spend < 1x Target CPA and 0 purchases, cannot score high
  if (spend < targets.targetCpa * 0.7 && purchases === 0) {
    return 35; // Neutral baseline
  }

  // 1. ROAS Score (0 - 100)
  const targetRoas = targets.targetRoas || 3;
  const roasRatio = roas / targetRoas;
  const roasScore = Math.min(100, Math.max(0, roasRatio * 60 + 20));

  // 2. CPA Score (0 - 100)
  let cpaScore = 50;
  if (purchases > 0 && cpa !== null) {
    if (cpa <= targets.targetCpa) {
      // Below target = excellent
      cpaScore = 80 + Math.min(20, ((targets.targetCpa - cpa) / targets.targetCpa) * 20);
    } else if (cpa <= targets.breakEvenCpa) {
      // Between target and breakeven = moderate
      cpaScore = 50 + ((targets.breakEvenCpa - cpa) / (targets.breakEvenCpa - targets.targetCpa)) * 30;
    } else {
      // Above breakeven = poor
      cpaScore = Math.max(0, 50 - ((cpa - targets.breakEvenCpa) / targets.breakEvenCpa) * 50);
    }
  } else {
    // 0 purchases or cpa null
    if (spend > targets.breakEvenCpa) {
      cpaScore = 10;
    } else {
      cpaScore = 40;
    }
  }

  // 3. CTR Score (0 - 100)
  const targetCtr = targets.targetCtr || 1.8;
  const ctrScore = Math.min(100, (ctr / targetCtr) * 70);

  // 4. Purchase Volume Bonus (0 - 100)
  const purchaseScore = Math.min(100, purchases * 10);

  // 5. Spend Efficiency Factor
  const spendFactor = spend > targets.targetCpa ? 80 : 40;

  const composite = (
    roasScore * 0.35 +
    cpaScore * 0.30 +
    ctrScore * 0.15 +
    purchaseScore * 0.10 +
    spendFactor * 0.10
  );

  return Math.round(composite);
}
