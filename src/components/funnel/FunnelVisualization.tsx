import React from 'react';
import { 
  Eye, 
  MousePointerClick, 
  Globe, 
  UserCheck,
  Touchpad,
  ShoppingCart, 
  CheckCircle, 
  AlertTriangle, 
  TrendingDown,
  Info
} from 'lucide-react';
import { FunnelStageMetrics, FunnelStageItem } from '../../types';

interface FunnelVisualizationProps {
  metrics: FunnelStageMetrics;
  funnelStages?: FunnelStageItem[];
  biggestDropoffStage?: string;
  onNavigateToLandingPage?: () => void;
}

export const FunnelVisualization: React.FC<FunnelVisualizationProps> = ({
  metrics,
  funnelStages,
  biggestDropoffStage,
  onNavigateToLandingPage,
}) => {
  const {
    impressions,
    linkClicks,
    landingPageViews,
    engagedVisitors,
    checkoutStarts,
    purchases,
    ctr,
    lpViewRate,
    checkoutRate,
    purchaseRate,
  } = metrics;

  // Drop-off calculations
  const linkToLpDrop = (linkClicks > 0 && landingPageViews !== null)
    ? Math.max(0, Math.round((1 - landingPageViews / linkClicks) * 100))
    : null;
  const isLpDropCritical = (linkToLpDrop !== null && linkToLpDrop >= 28) || (lpViewRate !== null && lpViewRate < 72);
  const isCheckoutDropCritical = checkoutStarts !== null && checkoutStarts > 0 && purchaseRate !== null && purchaseRate < 25;

  // If structured 7-stage funnel items are provided, map them cleanly
  const stagesToRender: FunnelStageItem[] = funnelStages && funnelStages.length === 7 ? funnelStages : [
    {
      name: 'Impression',
      stageKey: 'impression' as const,
      value: impressions > 0 ? impressions : 0,
      conversionRate: null,
      dropOffRate: null,
      status: impressions > 0 ? 'HEALTHY' as const : 'INSUFFICIENT_DATA' as const,
      evidence: [],
      source: 'META',
    },
    {
      name: 'Link Click',
      stageKey: 'link_click' as const,
      value: linkClicks > 0 ? linkClicks : 0,
      conversionRate: ctr > 0 ? ctr : null,
      dropOffRate: ctr > 0 ? Number((100 - ctr).toFixed(1)) : null,
      status: ctr >= 1.4 ? 'HEALTHY' as const : 'MONITOR' as const,
      evidence: [],
      source: 'META',
    },
    {
      name: 'Landing Page View',
      stageKey: 'landing_page_view' as const,
      value: landingPageViews,
      conversionRate: lpViewRate,
      dropOffRate: linkToLpDrop,
      status: landingPageViews === null ? 'UNKNOWN' as const : (isLpDropCritical ? 'PROBLEM' as const : 'HEALTHY' as const),
      evidence: [],
      source: landingPageViews !== null ? 'META' : 'UNKNOWN',
    },
    {
      name: 'Engaged Visitor',
      stageKey: 'engaged_visitor' as const,
      value: null,
      conversionRate: null,
      dropOffRate: null,
      status: 'UNKNOWN' as const,
      evidence: [],
      source: 'UNKNOWN',
    },
    {
      name: 'CTA Click',
      stageKey: 'cta_click' as const,
      value: metrics.ctaClicks ?? null,
      conversionRate: metrics.ctaClickRate ?? null,
      dropOffRate: null,
      status: metrics.ctaClicks !== undefined && metrics.ctaClicks !== null ? 'HEALTHY' as const : 'UNKNOWN' as const,
      evidence: [],
      source: metrics.ctaClicks !== undefined && metrics.ctaClicks !== null ? 'CUSTOM_EVENT' : 'UNKNOWN',
    },
    {
      name: 'Checkout',
      stageKey: 'checkout' as const,
      value: checkoutStarts,
      conversionRate: checkoutRate,
      dropOffRate: null,
      status: checkoutStarts === null ? 'UNKNOWN' as const : (isCheckoutDropCritical ? 'PROBLEM' as const : 'HEALTHY' as const),
      evidence: [],
      source: checkoutStarts !== null ? 'CUSTOM_EVENT' : 'UNKNOWN',
    },
    {
      name: 'Purchase',
      stageKey: 'purchase' as const,
      value: purchases >= 0 ? purchases : null,
      conversionRate: purchaseRate,
      dropOffRate: null,
      status: purchases > 0 ? 'HEALTHY' as const : 'MONITOR' as const,
      evidence: [],
      source: 'META',
    },
  ];

  const getStageIcon = (key: string) => {
    switch (key) {
      case 'impression': return Eye;
      case 'link_click': return MousePointerClick;
      case 'landing_page_view': return Globe;
      case 'engaged_visitor': return UserCheck;
      case 'cta_click': return Touchpad;
      case 'checkout': return ShoppingCart;
      case 'purchase': return CheckCircle;
      default: return Globe;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROBLEM':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'MONITOR':
        return 'text-amber-700 bg-amber-100 border-amber-200';
      case 'HEALTHY':
        return 'text-emerald-700 bg-emerald-100 border-emerald-200';
      case 'INSUFFICIENT_DATA':
        return 'text-gray-600 bg-gray-100 border-gray-200';
      default:
        return 'text-gray-500 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-gray-900">
              Visualisasi Alur Konversi Funnel (7 Tahap Terpadu)
            </h4>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Meta Ads + Clarity
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Lacak setiap tahapan: Impression &rarr; Link Click &rarr; LP View &rarr; Engaged &rarr; CTA &rarr; Checkout &rarr; Purchase.
          </p>
        </div>

        {biggestDropoffStage && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold self-start sm:self-auto">
            <TrendingDown className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Kebocoran Terbesar: <strong>{biggestDropoffStage}</strong></span>
          </div>
        )}
      </div>

      {/* Visual 7-Stage Sequence */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 relative">
        {stagesToRender.map((stage, idx) => {
          const IconComponent = getStageIcon(stage.stageKey);
          const isProblem = stage.status === 'PROBLEM';
          const isMonitor = stage.status === 'MONITOR';

          return (
            <div 
              key={stage.stageKey}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                isProblem
                  ? 'bg-red-50/70 border-red-300 ring-1 ring-red-200'
                  : isMonitor
                  ? 'bg-amber-50/60 border-amber-200'
                  : stage.stageKey === 'purchase'
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-gray-50/70 border-gray-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="flex items-center gap-1 truncate text-[11px]" title={stage.name}>
                    <IconComponent className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span>{idx + 1}. {stage.name}</span>
                  </span>
                </div>

                <div className="text-lg sm:text-xl font-bold text-gray-950 font-mono tracking-tight my-1">
                  {stage.value !== null ? stage.value.toLocaleString('id-ID') : (
                    <span className="text-gray-400 font-normal text-sm">N/A</span>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${getStatusBadge(stage.status)}`}>
                    {stage.status}
                  </span>
                  {stage.source && stage.source !== 'UNKNOWN' && (
                    <span className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1 rounded">
                      {stage.source}
                    </span>
                  )}
                </div>
              </div>

              {/* Conversion / Rate metrics */}
              <div className="mt-3 pt-2 border-t border-gray-200/80 text-[11px] space-y-0.5">
                {stage.conversionRate !== null ? (
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Conv:</span>
                    <span className="font-bold text-gray-900">{stage.conversionRate}%</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-400">
                    {stage.stageKey === 'impression' ? 'Tahap awal' : 'Conv: N/A'}
                  </div>
                )}

                {stage.dropOffRate !== null && stage.dropOffRate > 0 && (
                  <div className="flex items-center justify-between text-[10px] text-red-600 font-medium">
                    <span>Drop:</span>
                    <span>-{stage.dropOffRate}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanatory Footer note */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>
            Data disinkronkan secara deterministik dari <strong>Meta Insights</strong> & <strong>Microsoft Clarity</strong> tanpa estimasi artifisial.
          </span>
        </div>
        {onNavigateToLandingPage && (
          <button
            type="button"
            onClick={onNavigateToLandingPage}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            Buka Detail Perilaku Landing Page &rarr;
          </button>
        )}
      </div>
    </div>
  );
};
