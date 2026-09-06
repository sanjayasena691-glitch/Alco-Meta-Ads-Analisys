import { LandingPageProfile, LandingPageBehaviorMetrics } from '../../types';
import { LandingPageWithMetrics, ClarityProject } from './clarityTypes';

export const INITIAL_CLARITY_PROJECTS: ClarityProject[] = [
  {
    id: 'clarity_proj_alco_01',
    name: 'ALCO Academy Production',
    domain: 'alco.academy',
    totalSessionsToday: 1240,
  },
  {
    id: 'clarity_proj_staging_02',
    name: 'ALCO Staging / Funnel Lab',
    domain: 'staging.alco.academy',
    totalSessionsToday: 180,
  },
];

export const INITIAL_LANDING_PAGES: LandingPageWithMetrics[] = [
  // 🟢 LANDING PAGE A: HEALTHY (Ebook Sales Page)
  {
    profile: {
      id: 'lp_01',
      name: 'LP A - ALCO Ebook Sales Page',
      url: 'https://alco.academy/ebook-meta-ads',
      linkedCampaignIds: ['camp_01'],
      clarityProjectId: 'clarity_proj_alco_01',
      status: 'HEALTHY',
      lastSyncedAt: '10:15',
    },
    metrics: {
      sessions: 580,
      uniqueUsers: 510,
      avgScrollDepth: 74, // 74% scroll depth (very good)
      avgEngagementTime: 68, // 68s reading time
      rageClicks: 3,
      deadClicks: 8,
      excessiveScrolls: 4,
      quickBacks: 18, // ~3.1% quickback
      scriptErrors: 0,
      ctaClicks: 92,
      checkoutStarts: 54,
      purchases: 24,
    },
    previousMetrics: {
      sessions: 480,
      uniqueUsers: 430,
      avgScrollDepth: 71,
      avgEngagementTime: 62,
      rageClicks: 4,
      deadClicks: 10,
      excessiveScrolls: 5,
      quickBacks: 22,
      scriptErrors: 0,
      ctaClicks: 78,
      checkoutStarts: 44,
      purchases: 20,
    },
  },

  // 🟡/🔴 LANDING PAGE B: CONTENT / OFFER PROBLEM (Freelance Masterclass)
  // Traffic Meta masuk, tetapi scroll depth rendah (34%) dan quick back tinggi (45%), CTA clicks rendah
  {
    profile: {
      id: 'lp_02',
      name: 'LP B - Freelance Masterclass Enrollment',
      url: 'https://alco.academy/freelance-masterclass',
      linkedCampaignIds: ['camp_02'],
      clarityProjectId: 'clarity_proj_alco_01',
      status: 'PROBLEM',
      lastSyncedAt: '10:15',
    },
    metrics: {
      sessions: 320,
      uniqueUsers: 290,
      avgScrollDepth: 34, // Hanya 34% visitor yang scroll sampai bagian offer
      avgEngagementTime: 21, // Hanya 21 detik membaca
      rageClicks: 6,
      deadClicks: 12,
      excessiveScrolls: 8,
      quickBacks: 145, // 45.3% quick back! Keluar dalam waktu < 5 detik
      scriptErrors: 0,
      ctaClicks: 14, // Hanya 14 klik tombol CTA
      checkoutStarts: 22,
      purchases: 15,
    },
    previousMetrics: {
      sessions: 450,
      uniqueUsers: 400,
      avgScrollDepth: 48,
      avgEngagementTime: 38,
      rageClicks: 5,
      deadClicks: 11,
      excessiveScrolls: 7,
      quickBacks: 90,
      scriptErrors: 0,
      ctaClicks: 32,
      checkoutStarts: 38,
      purchases: 24,
    },
  },

  // 🔴 LANDING PAGE C: TECHNICAL & UX PROBLEM (Notion Productivity Hub)
  // Meta kirim 212 klik, tapi hanya 115 session termuat (LP View Rate 54%), script error spike, rage clicks tinggi
  {
    profile: {
      id: 'lp_03',
      name: 'LP C - Notion Life OS Productivity Checkout',
      url: 'https://alco.academy/notion-life-os',
      linkedCampaignIds: ['camp_03'],
      clarityProjectId: 'clarity_proj_alco_01',
      status: 'PROBLEM',
      lastSyncedAt: '10:15',
    },
    metrics: {
      sessions: 115,
      uniqueUsers: 105,
      avgScrollDepth: 28, // 28% scroll depth
      avgEngagementTime: 16, // 16s
      rageClicks: 48, // 48 rage clicks (klik berulang pada tombol yang macet/lambat)
      deadClicks: 72, // 72 dead clicks (elemen mockup dikira tombol)
      excessiveScrolls: 34, // Visitor panik scroll bolak-balik
      quickBacks: 68, // 59% quick back karena loading lambat
      scriptErrors: 29, // 29 script errors (checkout script crash di mobile)
      ctaClicks: 6,
      checkoutStarts: 2,
      purchases: 0,
    },
    previousMetrics: {
      sessions: 45,
      uniqueUsers: 40,
      avgScrollDepth: 30,
      avgEngagementTime: 18,
      rageClicks: 15,
      deadClicks: 22,
      excessiveScrolls: 10,
      quickBacks: 25,
      scriptErrors: 12,
      ctaClicks: 2,
      checkoutStarts: 0,
      purchases: 0,
    },
  },
];
