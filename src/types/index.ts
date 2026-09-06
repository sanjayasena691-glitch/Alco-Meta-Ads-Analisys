export type HealthStatus = 'HEALTHY' | 'NEED_ATTENTION' | 'CRITICAL' | 'NOT_ENOUGH_DATA';

export type EntityStatus = 'HEALTHY' | 'MONITOR' | 'PROBLEM' | 'NOT_ENOUGH_DATA';

export type TimePeriod = 
  | 'today' 
  | 'yesterday' 
  | 'last_3_days' 
  | 'last_7_days' 
  | 'last_14_days' 
  | 'last_30_days' 
  | 'custom';

export type ConfidenceLevel = 'Low' | 'Medium' | 'High';

export type RecommendationPriority = 
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'MAINTAIN'
  | 'HIGH_PRIORITY' 
  | 'OPTIMIZATION' 
  | 'MONITOR' 
  | 'NOT_ENOUGH_DATA';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type SignalType =
  | 'CTR_DROP'
  | 'CPA_SPIKE'
  | 'ROAS_DROP'
  | 'CPM_SPIKE'
  | 'CPC_SPIKE'
  | 'HIGH_FREQUENCY'
  | 'CREATIVE_FATIGUE'
  | 'HIGH_SPEND_NO_PURCHASE'
  | 'CAMPAIGN_NOT_SPENDING'
  | 'CREATIVE_OUTPERFORMING'
  | 'ADSET_OUTPERFORMING'
  | 'INSUFFICIENT_DATA'
  | 'HEALTHY_SCALING_CANDIDATE';

export type DataAvailability = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';

export interface PerformanceMetrics {
  spend: number | null;
  revenue: number | null;
  purchases: number | null;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  frequency: number | null;
  roas: number | null;
  cpa: number | null;
  ctr: number | null; // in percentage e.g. 2.15%
  cpc: number | null;
  cpm: number | null;
  // Optional Meta funnel metrics
  linkClicks?: number | null;
  outboundClicks?: number | null;
  landingPageViews?: number | null;
  addToCart?: number | null;
  initiateCheckout?: number | null;
  dataAvailability?: DataAvailability;
}

export interface MetricWithComparison {
  current: number | null;
  previous: number | null;
  percentChange: number | null;
  isPositiveChange: boolean | null; // whether the direction is favorable for business (e.g. higher ROAS is positive, lower CPA is positive)
  label: string;
}

export interface PeriodMetricsSummary {
  spend: MetricWithComparison;
  revenue: MetricWithComparison;
  purchases: MetricWithComparison;
  roas: MetricWithComparison;
  cpa: MetricWithComparison;
  ctr: MetricWithComparison;
  cpc: MetricWithComparison;
  cpm: MetricWithComparison;
  frequency: MetricWithComparison;
}

export interface BusinessTargets {
  productName: string;
  productPrice: number;
  targetCpa: number;
  breakEvenCpa: number;
  targetRoas: number;
  dailyBudget: number;
  targetCtr?: number;
  targetCpc?: number;
  minAcceptableRoas?: number;
}

export interface DetectedSignal {
  type: SignalType;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical' | 'neutral';
  confidence: ConfidenceLevel;
  evidence: string[];
}

export interface RuleEvaluation {
  entityId: string;
  entityName: string;
  entityType: 'account' | 'campaign' | 'adset' | 'ad';
  status: EntityStatus;
  signals: DetectedSignal[];
  primaryIssue?: string;
  recommendedAction?: string;
  dontDoYet?: string;
  confidence: ConfidenceLevel;
}

export type CreativeFormat = 'Video' | 'Image' | 'Carousel' | 'Collection' | 'UNKNOWN';
export type BudgetType = 'DAILY' | 'LIFETIME' | 'CAMPAIGN_LEVEL' | 'ADSET_LEVEL' | 'UNKNOWN';

export interface AdCreative {
  id: string;
  adSetId: string;
  campaignId: string;
  name: string;
  format: CreativeFormat;
  thumbnailUrl?: string;
  previewUrl?: string;
  hookText: string;
  status: EntityStatus;
  metrics: PerformanceMetrics;
  previousMetrics: PerformanceMetrics;
  evaluation?: RuleEvaluation;
  compositeScore?: number; // 0 - 100 based on ROAS, CPA, CTR, Spend, Purchase
  isWinner?: boolean;
}

export interface AdSet {
  id: string;
  campaignId: string;
  name: string;
  targetingSummary: string;
  dailyBudget: number | null;
  lifetimeBudget?: number | null;
  budgetType?: BudgetType;
  status: EntityStatus;
  metrics: PerformanceMetrics;
  previousMetrics: PerformanceMetrics;
  ads: AdCreative[];
  evaluation?: RuleEvaluation;
}

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  dailyBudget: number | null;
  lifetimeBudget?: number | null;
  budgetType?: BudgetType;
  status: EntityStatus;
  metrics: PerformanceMetrics;
  previousMetrics: PerformanceMetrics;
  adSets: AdSet[];
  evaluation?: RuleEvaluation;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  status: 'ACTIVE' | 'DISABLED';
  campaigns: Campaign[];
}

export interface StructuredAiAnalysis {
  entityName: string;
  entityType: string;
  whatHappened: string;
  primaryBottleneck?: string;
  secondaryIssue?: string | null;
  whereTheProblemIs?: string;
  why?: string;
  possibleCause: string;
  evidence: string[];
  recommendedAction: string;
  dontDoYet: string;
  nextThingToMonitor?: string;
  confidence: ConfidenceLevel;
  generatedAt: string;
  source: 'gemini' | 'rule_engine';
}

export interface RecommendationCardItem {
  id: string;
  entityId: string;
  entityName: string;
  entityType: 'Campaign' | 'Ad Set' | 'Creative' | 'Account' | 'Landing Page' | 'Funnel';
  priority: RecommendationPriority;
  confidence: ConfidenceLevel;
  status: EntityStatus;
  problem: string;
  evidence: string[];
  recommendedAction: string;
  dontDoYet?: string;
  potentialImpact: string;
}

export interface AnomalyAlert {
  id: string;
  entityName: string;
  entityType: 'Campaign' | 'Ad Set' | 'Creative' | 'Landing Page';
  title: string;
  metricLabel: string;
  changeDescription: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  ruleSignal: SignalType | LandingPageSignalType;
  possibleCause?: string;
  recommendedAction?: string;
}

export interface DailyTrendPoint {
  date: string;
  spend: number;
  revenue: number;
  roas: number;
  cpa: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  frequency: number;
}

// ==========================================
// LANDING PAGE DOMAIN MODEL
// ==========================================

export type LandingPageStatus = 'HEALTHY' | 'MONITOR' | 'PROBLEM' | 'NOT_ENOUGH_DATA';

export interface LandingPageProfile {
  id: string;
  name: string;
  url: string;
  linkedCampaignIds: string[];
  clarityProjectId?: string;
  status: LandingPageStatus;
  lastSyncedAt?: string;
}

export interface LandingPageBehaviorMetrics {
  sessions: number;
  uniqueUsers?: number;
  avgScrollDepth: number; // percentage (e.g. 65 = 65%)
  avgEngagementTime: number; // seconds
  rageClicks: number;
  deadClicks: number;
  excessiveScrolls: number;
  quickBacks: number;
  scriptErrors: number;
  ctaClicks?: number;
  checkoutStarts?: number;
  purchases?: number;
}

export interface LandingPageSnapshot {
  landingPageId: string;
  timestamp: string;
  metrics: LandingPageBehaviorMetrics;
}

export type LandingPageSignalType =
  | 'LOW_SCROLL_DEPTH'
  | 'LOW_ENGAGEMENT'
  | 'HIGH_RAGE_CLICK'
  | 'HIGH_DEAD_CLICK'
  | 'HIGH_QUICKBACK'
  | 'EXCESSIVE_SCROLL'
  | 'SCRIPT_ERROR_SPIKE'
  | 'LOW_CTA_INTERACTION'
  | 'LOW_CHECKOUT_RATE'
  | 'LOW_PURCHASE_CONVERSION'
  | 'INSUFFICIENT_LP_DATA';

export interface LandingPageSignal {
  type: LandingPageSignalType;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  evidence: string[];
}

export interface LandingPageEvaluation {
  healthScore: number; // 0 - 100
  status: LandingPageStatus;
  signals: LandingPageSignal[];
  primaryIssue?: string;
  confidence: ConfidenceLevel;
  recommendedAction?: string;
  dontDoYet?: string;
}

// ==========================================
// FUNNEL DIAGNOSIS DOMAIN MODEL
// ==========================================

export type FunnelBottleneck =
  | 'ADS'
  | 'CREATIVE'
  | 'LANDING_PAGE_TECHNICAL'
  | 'LANDING_PAGE_CONTENT'
  | 'OFFER'
  | 'CHECKOUT'
  | 'HEALTHY'
  | 'MONITOR'
  | 'INSUFFICIENT_DATA'
  | 'UNKNOWN';

export interface FunnelStageStatus {
  stageName: 'Meta Ads' | 'Landing Page' | 'Checkout' | 'Offer';
  status: 'HEALTHY' | 'MONITOR' | 'PROBLEM' | 'INSUFFICIENT_DATA' | 'UNKNOWN' | 'NOT_ENOUGH_DATA';
  score?: number | null;
  highlightText: string;
}

export interface FunnelStageMetrics {
  impressions: number;
  linkClicks: number;
  landingPageViews: number | null;
  engagedVisitors: number | null;
  ctaClicks?: number | null;
  checkoutStarts: number | null;
  purchases: number;
  // Rates in percentage (0 - 100) or null if unmeasured
  ctr: number;
  lpViewRate: number | null; // Landing Page Views / Link Clicks
  engagementRate: number | null; // Engaged Visitors / Landing Page Views
  ctaClickRate?: number | null; // CTA Clicks / Landing Page Views (or Sessions)
  checkoutRate: number | null; // Checkout Starts / Landing Page Views
  purchaseRate: number | null; // Purchases / Checkout Starts
  // Biggest dropoff
  biggestDropoffStage: string | null;
  dropoffPercentage: number | null;
}

export type FunnelStageKey = 
  | 'impression' 
  | 'link_click' 
  | 'landing_page_view' 
  | 'engaged_visitor' 
  | 'cta_click' 
  | 'checkout' 
  | 'purchase';

export type FunnelStageDataSource = 'META' | 'CLARITY' | 'CUSTOM_EVENT' | 'CALCULATED' | 'UNKNOWN';

export interface FunnelStageItem {
  name: string; // 'Impression' | 'Link Click' | 'Landing Page View' | 'Engaged Visitor' | 'CTA Click' | 'Checkout' | 'Purchase'
  stageKey: FunnelStageKey;
  value: number | null;
  conversionRate: number | null; // % from previous stage
  dropOffRate: number | null; // % dropoff from previous stage
  status: 'HEALTHY' | 'MONITOR' | 'PROBLEM' | 'INSUFFICIENT_DATA' | 'UNKNOWN';
  evidence: string[];
  source?: FunnelStageDataSource;
}

export interface FunnelDataCoverage {
  metaCoveragePercent: number; // e.g. 100
  lpCoveragePercent: number; // e.g. 72 or 100 or 0
  coverageType?: 'traffic' | 'page' | 'unknown';
  ctaTracked: boolean;
  checkoutTracked: boolean;
  notes?: string[];
}

export interface FunnelDiagnosisResult {
  mainBottleneck: FunnelBottleneck; // Primary bottleneck
  primaryBottleneck: FunnelBottleneck;
  secondaryIssue?: string | null;
  bottleneckTitle: string;
  headlineSummary: string;
  detailedReason: string;
  stages: FunnelStageStatus[];
  funnelStages?: FunnelStageItem[];
  metrics: FunnelStageMetrics;
  dataCoverage?: FunnelDataCoverage;
  evidence: string[];
  recommendedAction: string;
  dontDoYet: string;
  confidence: ConfidenceLevel;
  priority?: RecommendationPriority;
}

