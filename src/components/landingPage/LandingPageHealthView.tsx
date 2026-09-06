import React, { useState } from 'react';
import { 
  Globe, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  Link2, 
  MousePointer, 
  Eye, 
  Zap, 
  AlertCircle,
  Clock,
  Activity,
  Layers,
  HelpCircle
} from 'lucide-react';
import { LandingPageWithMetrics, ClarityConnectionConfig } from '../../services/clarity/clarityTypes';
import { evaluateLandingPageHealth } from '../../engine/rules/landingPage/landingPageRuleEvaluator';
import { Campaign, LandingPageStatus } from '../../types';
import { CampaignMappingModal } from './CampaignMappingModal';

interface LandingPageHealthViewProps {
  landingPages: LandingPageWithMetrics[];
  clarityConfig: ClarityConnectionConfig;
  availableCampaigns: Campaign[];
  onRefreshClarity: () => void;
  isSyncingClarity: boolean;
  syncNotice?: string;
  onUpdateMapping: (lpId: string, linkedCampaignIds: string[]) => void;
  onOpenAiDiagnosisForLp: (lp: LandingPageWithMetrics) => void;
}

export const LandingPageHealthView: React.FC<LandingPageHealthViewProps> = ({
  landingPages,
  clarityConfig,
  availableCampaigns,
  onRefreshClarity,
  isSyncingClarity,
  syncNotice,
  onUpdateMapping,
  onOpenAiDiagnosisForLp,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [mappingModalLp, setMappingModalLp] = useState<LandingPageWithMetrics | null>(null);

  // Calculate aggregated stats
  const totalSessions = landingPages.reduce((acc, lp) => acc + lp.metrics.sessions, 0);
  const avgScroll = landingPages.length > 0 
    ? Math.round(landingPages.reduce((acc, lp) => acc + lp.metrics.avgScrollDepth, 0) / landingPages.length)
    : 0;
  const totalQuickBacks = landingPages.reduce((acc, lp) => acc + lp.metrics.quickBacks, 0);
  const quickBackRate = totalSessions > 0 ? ((totalQuickBacks / totalSessions) * 100).toFixed(1) : '0';
  const totalScriptErrors = landingPages.reduce((acc, lp) => acc + lp.metrics.scriptErrors, 0);
  const totalRageClicks = landingPages.reduce((acc, lp) => acc + lp.metrics.rageClicks, 0);

  // Evaluations for each landing page
  const evaluatedPages = landingPages.map((lp) => {
    const evaluation = evaluateLandingPageHealth(lp.metrics, lp.profile.name);
    return {
      ...lp,
      evaluation,
    };
  });

  const filteredPages = evaluatedPages.filter((lp) => {
    if (filterStatus === 'ALL') return true;
    return lp.evaluation.status === filterStatus;
  });

  const getStatusBadge = (status: LandingPageStatus) => {
    switch (status) {
      case 'PROBLEM':
        return {
          label: 'Bermasalah',
          bg: 'bg-red-50 text-red-700 border-red-200',
          icon: ShieldAlert,
        };
      case 'MONITOR':
        return {
          label: 'Perlu Pantau',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: AlertTriangle,
        };
      case 'HEALTHY':
        return {
          label: 'Sehat & Optimal',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
        };
      case 'NOT_ENOUGH_DATA':
        return {
          label: 'Data Belum Cukup',
          bg: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: HelpCircle,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Service Connection & Sync Status */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                  Landing Page Intelligence & Clarity
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Clarity Active Sync</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                Mendeteksi apakah penurunan konversi bersumber dari <strong>kebocoran teknis loading</strong>, 
                <strong>ketidaksesuaian headline (message mismatch)</strong>, atau <strong>friksi pada form order</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={onRefreshClarity}
              disabled={isSyncingClarity}
              className="flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingClarity ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isSyncingClarity ? 'Menyinkronkan...' : 'Sync Clarity'}</span>
            </button>
          </div>
        </div>

        {/* Sync / Cache Notice */}
        {syncNotice && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-800 text-xs font-medium animate-in fade-in">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Behavioral Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-100">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[11px] text-gray-500 block font-medium">Total Sesi Visitor</span>
            <span className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5 block">
              {totalSessions.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-gray-400">Dari seluruh landing page</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[11px] text-gray-500 block font-medium">Rata-rata Scroll Depth</span>
            <span className={`text-lg sm:text-xl font-bold mt-0.5 block ${avgScroll >= 50 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {avgScroll}%
            </span>
            <span className="text-[10px] text-gray-400">Standar e-commerce: 50%+</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[11px] text-gray-500 block font-medium">Quick Backs (&lt; 5s)</span>
            <span className={`text-lg sm:text-xl font-bold mt-0.5 block ${Number(quickBackRate) > 30 ? 'text-red-700' : 'text-gray-900'}`}>
              {quickBackRate}%
            </span>
            <span className="text-[10px] text-gray-400">{totalQuickBacks} sesi langsung keluar</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-[11px] text-gray-500 block font-medium">Kendala Teknis (Errors)</span>
            <span className={`text-lg sm:text-xl font-bold mt-0.5 block ${totalScriptErrors > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {totalScriptErrors} Script Errors
            </span>
            <span className="text-[10px] text-gray-400">{totalRageClicks} rage clicks terdeteksi</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-semibold">
          {[
            { id: 'ALL', label: `Semua (${evaluatedPages.length})` },
            { id: 'PROBLEM', label: `Bermasalah (${evaluatedPages.filter(p => p.evaluation.status === 'PROBLEM').length})` },
            { id: 'MONITOR', label: `Perlu Pantau (${evaluatedPages.filter(p => p.evaluation.status === 'MONITOR').length})` },
            { id: 'HEALTHY', label: `Sehat (${evaluatedPages.filter(p => p.evaluation.status === 'HEALTHY').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Landing Pages Cards List */}
      <div className="space-y-4">
        {filteredPages.map((lp) => {
          const { profile, metrics, evaluation } = lp;
          const statusBadge = getStatusBadge(evaluation.status);
          const StatusIcon = statusBadge.icon;

          // Find linked campaigns
          const linkedCamps = availableCampaigns.filter((c) =>
            profile.linkedCampaignIds.includes(c.id)
          );

          return (
            <div
              key={profile.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-5"
            >
              {/* Card Top: Title, URL, Score, Status */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">
                      {profile.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusBadge.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <a
                      href={profile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1 font-mono truncate max-w-sm sm:max-w-md"
                    >
                      <span>{profile.url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Health Score
                    </div>
                    <div className={`text-2xl font-extrabold ${
                      evaluation.healthScore >= 75 ? 'text-emerald-700' : evaluation.healthScore >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {evaluation.healthScore}<span className="text-xs font-normal text-gray-400">/100</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenAiDiagnosisForLp(lp)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Diagnosis AI</span>
                  </button>
                </div>
              </div>

              {/* Linked Meta Campaigns Bar */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-700">Campaign Meta Terhubung:</span>
                  {linkedCamps.length > 0 ? (
                    linkedCamps.map((camp) => (
                      <span
                        key={camp.id}
                        className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-800 font-medium"
                      >
                        {camp.name} (Spend: Rp{camp.metrics.spend.toLocaleString('id-ID')})
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">Belum dihubungkan ke campaign</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setMappingModalLp(lp)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  Ubah Mapping Campaign &rarr;
                </button>
              </div>

              {/* Behavioral Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 text-[10px] block font-medium">Sesi (Visitors)</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                    {metrics.sessions}
                  </span>
                  <span className="text-[10px] text-gray-400">{metrics.uniqueUsers || metrics.sessions} users</span>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 text-[10px] block font-medium">Scroll Depth</span>
                  <span className={`font-bold text-sm mt-0.5 block ${metrics.avgScrollDepth >= 50 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {metrics.avgScrollDepth}%
                  </span>
                  <span className="text-[10px] text-gray-400">Rata-rata baca</span>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 text-[10px] block font-medium">Waktu Aktif</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                    {metrics.avgEngagementTime}s
                  </span>
                  <span className="text-[10px] text-gray-400">Engagement</span>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 text-[10px] block font-medium">Quick Backs</span>
                  <span className={`font-bold text-sm mt-0.5 block ${metrics.quickBacks > 30 ? 'text-red-600' : 'text-gray-900'}`}>
                    {metrics.quickBacks}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {metrics.sessions > 0 ? ((metrics.quickBacks / metrics.sessions) * 100).toFixed(0) : 0}% bounce &lt;5s
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 text-[10px] block font-medium">Rage Clicks</span>
                  <span className={`font-bold text-sm mt-0.5 block ${metrics.rageClicks >= 15 ? 'text-red-600' : 'text-gray-900'}`}>
                    {metrics.rageClicks}
                  </span>
                  <span className="text-[10px] text-gray-400">Klik berulang</span>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 text-[10px] block font-medium">Dead Clicks</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                    {metrics.deadClicks}
                  </span>
                  <span className="text-[10px] text-gray-400">Elemen non-link</span>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 text-[10px] block font-medium">Script Errors</span>
                  <span className={`font-bold text-sm mt-0.5 block ${metrics.scriptErrors >= 5 ? 'text-red-600 font-extrabold' : 'text-gray-900'}`}>
                    {metrics.scriptErrors}
                  </span>
                  <span className="text-[10px] text-gray-400">{metrics.scriptErrors > 0 ? 'Crash JS' : 'Nol error'}</span>
                </div>
              </div>

              {/* Signals and Recommendations Box */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-2">
                {/* Signals */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                  <div className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sinyal Perilaku Terdeteksi:</span>
                  </div>
                  {evaluation.signals.length === 0 ? (
                    <div className="text-gray-500">Tidak ada sinyal friksi kritis. Halaman berjalan optimal.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {evaluation.signals.map((sig, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 uppercase ${
                            sig.severity === 'critical' ? 'bg-red-100 text-red-700' : sig.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {sig.severity}
                          </span>
                          <span className="text-gray-700 font-medium">{sig.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Action Prescriptions */}
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rekomendasi Tindakan:</span>
                  </div>
                  <p className="text-emerald-900 leading-relaxed font-medium">
                    {evaluation.recommendedAction}
                  </p>
                  <div className="text-[11px] text-red-700 pt-1 font-semibold">
                    &bull; Jangan lakukan: {evaluation.dontDoYet}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mapping Modal */}
      {mappingModalLp && (
        <CampaignMappingModal
          isOpen={!!mappingModalLp}
          onClose={() => setMappingModalLp(null)}
          landingPage={mappingModalLp}
          availableCampaigns={availableCampaigns}
          onSaveMapping={onUpdateMapping}
        />
      )}
    </div>
  );
};
