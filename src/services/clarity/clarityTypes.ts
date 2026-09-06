import { LandingPageProfile, LandingPageBehaviorMetrics, TimePeriod } from '../../types';

export interface ClarityConnectionConfig {
  isConnected: boolean;
  isMockMode: boolean;
  projectId: string;
  projectName: string;
  apiToken?: string;
  lastSyncedAt: string;
  nextAllowedSyncAt: number; // Unix timestamp in ms
}

export interface ClarityProject {
  id: string;
  name: string;
  domain: string;
  totalSessionsToday: number;
}

export interface LandingPageWithMetrics {
  profile: LandingPageProfile;
  metrics: LandingPageBehaviorMetrics;
  previousMetrics: LandingPageBehaviorMetrics;
}
