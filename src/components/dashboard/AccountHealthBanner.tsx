import React from 'react';
import { 
  Sparkles, 
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Flame
} from 'lucide-react';
import { HealthStatus, DetectedSignal } from '../../types';

interface AccountHealthBannerProps {
  healthStatus: HealthStatus;
  issueCount: number;
  onAnalyzeWithAi: () => void;
  priorityIssue?: {
    entityName: string;
    entityType: string;
    issueTitle: string;
    metricChanges: { label: string; change: string; isNegative: boolean }[];
    signalType: string;
    onViewDetail: () => void;
  };
}

export const AccountHealthBanner: React.FC<AccountHealthBannerProps> = ({
  healthStatus,
  issueCount,
  onAnalyzeWithAi,
  priorityIssue,
}) => {
  const getHealthMeta = () => {
    switch (healthStatus) {
      case 'HEALTHY':
        return {
          label: 'Healthy',
          textColor: 'text-green-600',
          dotBg: 'bg-green-500',
          dotShadow: 'shadow-[0_0_8px_rgba(34,197,94,0.5)]',
          summary: 'All campaigns are operating within target corridors.',
          issuesText: issueCount > 0 ? `${issueCount} items to monitor` : 'No critical issues detected',
        };
      case 'NEED_ATTENTION':
        return {
          label: 'Attention',
          textColor: 'text-amber-500',
          dotBg: 'bg-amber-500',
          dotShadow: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
          summary: 'Cost anomalies or fatigue signals require adjustment.',
          issuesText: `${issueCount} issues detected by AI`,
        };
      case 'CRITICAL':
        return {
          label: 'Critical',
          textColor: 'text-red-500',
          dotBg: 'bg-red-500',
          dotShadow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
          summary: 'Significant budget waste detected exceeding threshold.',
          issuesText: `${issueCount} critical issues detected by AI`,
        };
      case 'NOT_ENOUGH_DATA':
      default:
        return {
          label: 'Calibrating',
          textColor: 'text-gray-500',
          dotBg: 'bg-gray-400',
          dotShadow: 'shadow-[0_0_8px_rgba(156,163,175,0.5)]',
          summary: 'Campaigns are currently in learning phase.',
          issuesText: 'Initial calibration in progress',
        };
    }
  };

  const meta = getHealthMeta();

  return (
    <div className="space-y-4">
      {/* 4-column Grid matching Clean Minimalism Design */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Col 1: Account Health Box */}
        <div className="md:col-span-1 bg-white p-5 border border-gray-200 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Account Health
            </h3>
            <div className="flex items-center gap-2.5">
              <div className={`text-2xl font-bold uppercase tracking-tight ${meta.textColor}`}>
                {meta.label}
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${meta.dotBg} ${meta.dotShadow}`} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            {meta.issuesText}
          </p>
        </div>

        {/* Col 2-4: Clean Minimalist Deep Indigo AI Banner */}
        <div className="md:col-span-3 bg-indigo-900 p-5 rounded-xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-xs">
          <div className="relative z-10 space-y-1">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
              AI Recommendation
            </h3>
            <p className="text-sm font-medium max-w-xl text-indigo-50 leading-relaxed">
              {priorityIssue ? (
                <>
                  &ldquo;Creative <span className="text-indigo-200 underline underline-offset-4 font-semibold">{priorityIssue.entityName}</span> shows creative fatigue. Frequency rose while CTR dropped. Prepare new hooks.&rdquo;
                </>
              ) : (
                <>
                  &ldquo;Account pacing is stable. Maintain current active ad sets and test new creative variations with 15% budget increment.&rdquo;
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onAnalyzeWithAi}
            className="relative z-10 px-4 py-2 bg-white text-indigo-900 hover:bg-gray-100 rounded-lg text-sm font-bold shadow-md whitespace-nowrap transition-colors cursor-pointer shrink-0"
          >
            Analyze with AI
          </button>

          {/* Minimalist ambient blur */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
        </div>
      </section>

      {/* Priority Issue Spotlight Strip (if exists) */}
      {priorityIssue && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                  Priority Issue
                </span>
                <span className="text-xs font-bold text-gray-900">
                  {priorityIssue.entityName}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-gray-600">
                  {priorityIssue.issueTitle}
                </span>
                {priorityIssue.metricChanges.map((m, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.2 rounded ${
                      m.isNegative ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {m.label} {m.change}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={priorityIssue.onViewDetail}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <span>View Detail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
