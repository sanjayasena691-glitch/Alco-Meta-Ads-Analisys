import { 
  Campaign, 
  AdSet, 
  AdCreative, 
  PerformanceMetrics, 
  TimePeriod,
  EntityStatus
} from '../../types';

export type MetaAdsMode = 'mock' | 'real';

export type MetaSyncStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR' | 'REAUTH_REQUIRED' | 'STALE';

/**
 * Meta Marketing API Connection Configuration
 * NOTE: For React/Vite development, credentials reside in client state for testing.
 * In future desktop builds (Electron), credentials must be stored securely in Main Process / OS Keychain.
 */
export interface MetaConnectionConfig {
  mode: MetaAdsMode;
  accessToken?: string;
  selectedAdAccountId?: string;
  selectedAdAccountName?: string;
  selectedAdAccountCurrency?: string;
  selectedAdAccountTimezone?: string;
  lastSyncedAt?: string;
  syncStatus: MetaSyncStatus;
  errorMessage?: string;
}

export interface MetaAdAccountSummary {
  id: string; // Normalised 'act_<ID>'
  accountId: string; // Raw numeric ID
  name: string;
  currency: string;
  timezone: string;
  accountStatus: number; // 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, 7 = PENDING_RISK_REVIEW, etc.
  businessName?: string;
}

export interface MetaGraphActionItem {
  action_type: string;
  value: string | number;
}

export interface MetaGraphInsightsRaw {
  account_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  impressions?: string | number;
  reach?: string | number;
  spend?: string | number;
  clicks?: string | number;
  frequency?: string | number;
  ctr?: string | number;
  cpc?: string | number;
  cpm?: string | number;
  actions?: MetaGraphActionItem[];
  action_values?: MetaGraphActionItem[];
  date_start?: string;
  date_stop?: string;
}

export interface MetaGraphCampaignRaw {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string | number;
  lifetime_budget?: string | number;
}

export interface MetaGraphAdSetRaw {
  id: string;
  campaign_id: string;
  name: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string | number;
  lifetime_budget?: string | number;
  targeting?: {
    age_min?: number;
    age_max?: number;
    geo_locations?: { countries?: string[] };
    flexible_spec?: any[];
  };
}

export interface MetaGraphAdRaw {
  id: string;
  adset_id: string;
  campaign_id: string;
  name: string;
  status?: string;
  effective_status?: string;
  creative?: {
    id?: string;
    name?: string;
    thumbnail_url?: string;
    image_url?: string;
    body?: string;
    title?: string;
  };
}

export interface MetaGraphPaging {
  cursors?: { before?: string; after?: string };
  next?: string;
  previous?: string;
}

export interface MetaGraphResponse<T> {
  data: T[];
  paging?: MetaGraphPaging;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface MetaDateRange {
  since: string;
  until: string;
}

export interface MetaApiDebugInfo {
  mode: MetaAdsMode;
  lastRequestLevel?: 'account' | 'campaign' | 'adset' | 'ad';
  period?: TimePeriod;
  dateRange?: { current: MetaDateRange; previous: MetaDateRange };
  adAccountId?: string;
  entityCount?: { campaigns: number; adSets: number; ads: number };
  insightsCount?: number;
  missingFields?: string[];
  lastApiError?: string;
}
