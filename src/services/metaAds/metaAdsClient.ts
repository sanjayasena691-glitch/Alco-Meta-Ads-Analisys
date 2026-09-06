import { 
  MetaAdAccountSummary, 
  MetaGraphResponse, 
  MetaGraphCampaignRaw, 
  MetaGraphAdSetRaw, 
  MetaGraphAdRaw, 
  MetaGraphInsightsRaw,
  MetaDateRange
} from './metaAdsTypes';

// Verify this version against the Meta App's currently supported Graph API version before real-token testing.
export const META_GRAPH_API_VERSION = ((import.meta as any).env?.VITE_META_GRAPH_API_VERSION as string) || 'v21.0';
export const META_GRAPH_BASE_URL = 'https://graph.facebook.com';

/**
 * Normalizes Ad Account ID ensuring uniform 'act_<ID>' format.
 * Prevents double prefixing like 'act_act_123'.
 */
export function normalizeAdAccountId(id: string): string {
  if (!id) return '';
  const cleanId = id.trim().replace(/^act_+/i, '');
  return `act_${cleanId}`;
}

export class MetaApiError extends Error {
  public code: number;
  public subcode?: number;
  public isAuthError: boolean;
  public isRateLimit: boolean;
  public isPermissionError: boolean;

  constructor(message: string, code: number = 0, subcode?: number) {
    super(message);
    this.name = 'MetaApiError';
    this.code = code;
    this.subcode = subcode;
    this.isAuthError = code === 190 || code === 102;
    this.isRateLimit = code === 17 || code === 32 || code === 613;
    this.isPermissionError = code === 200 || code === 278 || code === 10;
  }
}

class MetaAdsClient {
  private buildUrl(path: string, params: Record<string, string | number | boolean | undefined> = {}): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(`${META_GRAPH_BASE_URL}/${META_GRAPH_API_VERSION}/${cleanPath}`);
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }
    return url.toString();
  }

  /**
   * Safe fetcher with error normalization.
   * NOTE: Token is transmitted securely in Bearer header without logging.
   */
  private async fetchMeta<T>(url: string, accessToken: string): Promise<T> {
    if (!accessToken || !accessToken.trim()) {
      throw new MetaApiError('Meta Access Token belum dikonfigurasi.', 190);
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.trim()}`,
          'Accept': 'application/json',
        },
      });

      const json = await response.json();

      if (json.error) {
        const err = json.error;
        let userFriendlyMsg = err.message || 'Terjadi kesalahan pada Meta Graph API.';
        if (err.code === 190) {
          userFriendlyMsg = 'Meta access token tidak valid atau sudah kedaluwarsa. Silakan perbarui token Anda.';
        } else if (err.code === 17 || err.code === 32 || err.code === 613) {
          userFriendlyMsg = 'Batas permintaan (rate limit) Meta API tercapai. Mohon tunggu beberapa menit.';
        } else if (err.code === 200) {
          userFriendlyMsg = 'Izin akses ditolak. Pastikan token memiliki permission ads_read atau ads_management.';
        }
        throw new MetaApiError(userFriendlyMsg, err.code, err.error_subcode);
      }

      if (!response.ok) {
        throw new MetaApiError(`HTTP Error ${response.status}: ${response.statusText}`, response.status);
      }

      return json as T;
    } catch (err: any) {
      if (err instanceof MetaApiError) {
        throw err;
      }
      throw new MetaApiError(err.message || 'Gagal terhubung ke Meta Graph API (Network Error).', 0);
    }
  }

  /**
   * Reusable pagination helper with maxPages loop guard.
   */
  public async fetchAllPages<T>(initialUrl: string, accessToken: string, maxPages: number = 5): Promise<T[]> {
    const results: T[] = [];
    let nextUrl: string | undefined = initialUrl;
    let pageCount = 0;

    while (nextUrl && pageCount < maxPages) {
      const response: MetaGraphResponse<T> = await this.fetchMeta<MetaGraphResponse<T>>(nextUrl, accessToken);
      if (response.data && Array.isArray(response.data)) {
        results.push(...response.data);
      }
      nextUrl = response.paging?.next;
      pageCount++;
    }

    return results;
  }

  /**
   * Tests token validity and fetches current user info.
   */
  public async testConnection(accessToken: string): Promise<{ id: string; name: string }> {
    const url = this.buildUrl('me', { fields: 'id,name' });
    return this.fetchMeta<{ id: string; name: string }>(url, accessToken);
  }

  /**
   * Discovers all accessible Ad Accounts for the user.
   */
  public async getAdAccounts(accessToken: string): Promise<MetaAdAccountSummary[]> {
    const url = this.buildUrl('me/adaccounts', {
      fields: 'id,account_id,name,currency,timezone_name,account_status,business_name',
      limit: 50,
    });

    const rawAccounts = await this.fetchAllPages<{
      id: string;
      account_id: string;
      name: string;
      currency?: string;
      timezone_name?: string;
      account_status?: number;
      business_name?: string;
    }>(url, accessToken, 3);

    return rawAccounts.map((acc) => ({
      id: normalizeAdAccountId(acc.id || acc.account_id),
      accountId: acc.account_id || acc.id.replace(/^act_/, ''),
      name: acc.name || `Ad Account ${acc.account_id}`,
      currency: acc.currency || 'IDR',
      timezone: acc.timezone_name || 'Asia/Jakarta',
      accountStatus: acc.account_status ?? 1,
      businessName: acc.business_name,
    }));
  }

  /**
   * Fetches campaigns for an Ad Account.
   */
  public async getCampaigns(adAccountId: string, accessToken: string): Promise<MetaGraphCampaignRaw[]> {
    const normId = normalizeAdAccountId(adAccountId);
    const url = this.buildUrl(`${normId}/campaigns`, {
      fields: 'id,name,objective,status,effective_status,daily_budget,lifetime_budget',
      limit: 100,
    });
    return this.fetchAllPages<MetaGraphCampaignRaw>(url, accessToken, 3);
  }

  /**
   * Fetches ad sets for an Ad Account (or filtered by campaign).
   */
  public async getAdSets(adAccountId: string, accessToken: string, campaignId?: string): Promise<MetaGraphAdSetRaw[]> {
    const normId = normalizeAdAccountId(adAccountId);
    const path = campaignId ? `${campaignId}/adsets` : `${normId}/adsets`;
    const url = this.buildUrl(path, {
      fields: 'id,campaign_id,name,status,effective_status,daily_budget,lifetime_budget,targeting',
      limit: 100,
    });
    return this.fetchAllPages<MetaGraphAdSetRaw>(url, accessToken, 3);
  }

  /**
   * Fetches ads / creatives for an Ad Account (or filtered by adset).
   */
  public async getAds(adAccountId: string, accessToken: string, adSetId?: string): Promise<MetaGraphAdRaw[]> {
    const normId = normalizeAdAccountId(adAccountId);
    const path = adSetId ? `${adSetId}/ads` : `${normId}/ads`;
    const url = this.buildUrl(path, {
      fields: 'id,adset_id,campaign_id,name,status,effective_status,creative{id,name,thumbnail_url,image_url,body,title}',
      limit: 100,
    });
    return this.fetchAllPages<MetaGraphAdRaw>(url, accessToken, 3);
  }

  /**
   * Reusable Insights request builder across levels (account, campaign, adset, ad).
   */
  public async getInsights(
    entityId: string,
    accessToken: string,
    params: {
      level?: 'account' | 'campaign' | 'adset' | 'ad';
      dateRange: MetaDateRange;
    }
  ): Promise<MetaGraphInsightsRaw[]> {
    const normId = entityId.startsWith('act_') ? normalizeAdAccountId(entityId) : entityId;
    const timeRangeJson = JSON.stringify({
      since: params.dateRange.since,
      until: params.dateRange.until,
    });

    const url = this.buildUrl(`${normId}/insights`, {
      level: params.level || 'campaign',
      time_range: timeRangeJson,
      fields: [
        'account_id',
        'campaign_id',
        'campaign_name',
        'adset_id',
        'adset_name',
        'ad_id',
        'ad_name',
        'impressions',
        'reach',
        'spend',
        'clicks',
        'frequency',
        'ctr',
        'cpc',
        'cpm',
        'actions',
        'action_values',
        'date_start',
        'date_stop'
      ].join(','),
      limit: 100,
    });

    return this.fetchAllPages<MetaGraphInsightsRaw>(url, accessToken, 5);
  }
}

export const metaAdsClient = new MetaAdsClient();
