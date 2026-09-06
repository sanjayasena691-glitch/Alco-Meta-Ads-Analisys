import { TimePeriod } from '../../types';
import { 
  ClarityConnectionConfig, 
  ClarityProject, 
  LandingPageWithMetrics 
} from './clarityTypes';
import { 
  INITIAL_CLARITY_PROJECTS, 
  INITIAL_LANDING_PAGES 
} from './clarityMockData';

function getPeriodScaleFactor(period?: TimePeriod): number {
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

class ClarityService {
  private config: ClarityConnectionConfig = {
    isConnected: true,
    isMockMode: true,
    projectId: 'clarity_proj_alco_01',
    projectName: 'ALCO Academy Production',
    apiToken: 'MOCK_CLARITY_TOKEN',
    lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    nextAllowedSyncAt: 0,
  };

  private projects: ClarityProject[] = INITIAL_CLARITY_PROJECTS;
  private landingPages: LandingPageWithMetrics[] = JSON.parse(JSON.stringify(INITIAL_LANDING_PAGES));

  public getConnectionConfig(): ClarityConnectionConfig {
    return { ...this.config };
  }

  public setConnectionConfig(config: Partial<ClarityConnectionConfig>): ClarityConnectionConfig {
    this.config = {
      ...this.config,
      ...config,
      lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
    return { ...this.config };
  }

  public async getProjects(): Promise<ClarityProject[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return [...this.projects];
  }

  public async getLandingPages(period?: TimePeriod): Promise<LandingPageWithMetrics[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const factor = getPeriodScaleFactor(period);

    return this.landingPages.map((lp) => {
      if (factor === 1.0) return { ...lp };
      return {
        ...lp,
        metrics: {
          ...lp.metrics,
          sessions: Math.round(lp.metrics.sessions * factor),
          uniqueUsers: lp.metrics.uniqueUsers ? Math.round(lp.metrics.uniqueUsers * factor) : undefined,
          rageClicks: Math.round(lp.metrics.rageClicks * factor),
          deadClicks: Math.round(lp.metrics.deadClicks * factor),
          excessiveScrolls: Math.round(lp.metrics.excessiveScrolls * factor),
          quickBacks: Math.round(lp.metrics.quickBacks * factor),
          scriptErrors: Math.round(lp.metrics.scriptErrors * factor),
          ctaClicks: lp.metrics.ctaClicks ? Math.round(lp.metrics.ctaClicks * factor) : undefined,
          checkoutStarts: lp.metrics.checkoutStarts ? Math.round(lp.metrics.checkoutStarts * factor) : undefined,
          purchases: lp.metrics.purchases ? Math.round(lp.metrics.purchases * factor) : undefined,
        },
      };
    });
  }

  public async getLandingPageById(id: string, period?: TimePeriod): Promise<LandingPageWithMetrics | undefined> {
    const list = await this.getLandingPages(period);
    return list.find((item) => item.profile.id === id);
  }

  public updateLandingPageMapping(lpId: string, linkedCampaignIds: string[]): LandingPageWithMetrics | undefined {
    const target = this.landingPages.find((item) => item.profile.id === lpId);
    if (target) {
      target.profile.linkedCampaignIds = linkedCampaignIds;
      return { ...target };
    }
    return undefined;
  }

  public updateCampaignMapping(lpId: string, linkedCampaignIds: string[]): LandingPageWithMetrics[] {
    this.updateLandingPageMapping(lpId, linkedCampaignIds);
    return [...this.landingPages];
  }

  public getInitialLandingPages(): LandingPageWithMetrics[] {
    return JSON.parse(JSON.stringify(this.landingPages));
  }

  public updateLandingPageDetails(lpId: string, name: string, url: string): LandingPageWithMetrics | undefined {
    const target = this.landingPages.find((item) => item.profile.id === lpId);
    if (target) {
      target.profile.name = name;
      target.profile.url = url;
      return { ...target };
    }
    return undefined;
  }

  public async refreshLandingPages(
    period?: TimePeriod,
    force: boolean = false
  ): Promise<{
    success: boolean;
    isRateLimited: boolean;
    message: string;
    data: LandingPageWithMetrics[];
  }> {
    const now = Date.now();

    // Cache-awareness & Rate Limit Cooldown (60s minimum interval)
    if (!force && this.config.nextAllowedSyncAt > now) {
      const remainingSeconds = Math.ceil((this.config.nextAllowedSyncAt - now) / 1000);
      const cachedData = await this.getLandingPages(period);
      return {
        success: true,
        isRateLimited: true,
        message: `Data landing page masih dalam masa cache (tersinkronisasi pukul ${this.config.lastSyncedAt}). Harap tunggu ${remainingSeconds} detik sebelum sync ulang API.`,
        data: cachedData,
      };
    }

    // Simulate API network latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    this.config.lastSyncedAt = timeStr;
    // Set 60s rate limit cooldown
    this.config.nextAllowedSyncAt = now + 60_000;

    this.landingPages.forEach((lp) => {
      lp.profile.lastSyncedAt = timeStr;
    });

    const data = await this.getLandingPages(period);
    return {
      success: true,
      isRateLimited: false,
      message: `Sinkronisasi berhasil! Data perilaku pengunjung dari Microsoft Clarity telah diperbarui (${timeStr}).`,
      data,
    };
  }

  public async refreshData(period?: TimePeriod): Promise<{
    landingPages: LandingPageWithMetrics[];
    isRateLimited: boolean;
    message: string;
  }> {
    const res = await this.refreshLandingPages(period);
    return {
      landingPages: res.data,
      isRateLimited: res.isRateLimited,
      message: res.message,
    };
  }
}

export const clarityService = new ClarityService();
