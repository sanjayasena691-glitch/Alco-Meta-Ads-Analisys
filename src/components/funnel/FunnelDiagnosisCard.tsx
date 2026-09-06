import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  ShieldAlert, 
  Ban, 
  Lightbulb,
  Zap,
  Gauge,
  Layers,
  Terminal,
  ChevronDown,
  ChevronUp,
  Play
} from 'lucide-react';
import { FunnelDiagnosisResult, FunnelBottleneck, RecommendationPriority } from '../../types';
import { FunnelVisualization } from './FunnelVisualization';
import { runFunnelScenarioTests, ScenarioTestResult } from '../../engine/funnel/funnelTestScenarios';

interface FunnelDiagnosisCardProps {
  diagnosis: FunnelDiagnosisResult;
  onOpenAiConsultant: () => void;
  onNavigateToLandingPages?: () => void;
}

export const FunnelDiagnosisCard: React.FC<FunnelDiagnosisCardProps> = ({
  diagnosis,
  onOpenAiConsultant,
  onNavigateToLandingPages,
}) => {
  const {
    mainBottleneck,
    primaryBottleneck = mainBottleneck,
    secondaryIssue,
    bottleneckTitle,
    headlineSummary,
    detailedReason,
    stages,
    funnelStages,
    metrics,
    evidence,
    recommendedAction,
    dontDoYet,
    confidence,
    priority = 'HIGH',
  } = diagnosis;

  // Debug Panel State (for Developer/Testing verification)
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [scenarioResults, setScenarioResults] = useState<{
    allPassed: boolean;
    total: number;
    passedCount: number;
    results: ScenarioTestResult[];
  } | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleRunScenarios = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const res = runFunnelScenarioTests();
      setScenarioResults(res);
      setIsRunningTests(false);
    }, 150);
  };

  const getBottleneckBadge = (b: FunnelBottleneck) => {
    switch (b) {
      case 'LANDING_PAGE_TECHNICAL':
        return {
          label: 'Kendala Teknis / Loading Web',
          bg: 'bg-red-50 text-red-700 border-red-200',
          icon: ShieldAlert,
        };
      case 'LANDING_PAGE_CONTENT':
        return {
          label: 'Kesesuaian Pesan Landing Page (Mismatch)',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: AlertTriangle,
        };
      case 'CHECKOUT':
        return {
          label: 'Friksi Form Checkout / Pembayaran',
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: AlertTriangle,
        };
      case 'CREATIVE':
        return {
          label: 'Kelelahan Materi Iklan (Creative Fatigue)',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Zap,
        };
      case 'ADS':
        return {
          label: 'Daya Tarik Iklan Meta (Low CTR)',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Gauge,
        };
      case 'OFFER':
        return {
          label: 'Resistensi Penawaran / Margin',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertTriangle,
        };
      case 'INSUFFICIENT_DATA':
        return {
          label: 'Data Pengujian Belum Cukup',
          bg: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: HelpCircle,
        };
      case 'HEALTHY':
        return {
          label: 'Funnel Berjalan Harmonis',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
        };
      default:
        return {
          label: 'Perlu Pemantauan (Monitoring)',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: HelpCircle,
        };
    }
  };

  const getPriorityBadgeClass = (p?: RecommendationPriority) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'MAINTAIN':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const badgeInfo = getBottleneckBadge(primaryBottleneck);
  const BadgeIcon = badgeInfo.icon;

  const isProblem = primaryBottleneck === 'LANDING_PAGE_TECHNICAL' || 
                    primaryBottleneck === 'LANDING_PAGE_CONTENT' || 
                    primaryBottleneck === 'CHECKOUT' || 
                    primaryBottleneck === 'CREATIVE' || 
                    primaryBottleneck === 'ADS' ||
                    primaryBottleneck === 'OFFER';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Top Banner: Primary Bottleneck & Conflict Resolution */}
      <div className={`p-5 sm:p-6 border-b ${
        isProblem ? 'bg-amber-50/40 border-amber-100' : 'bg-gray-50/60 border-gray-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Pusat Diagnosis Funnel Terpadu
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeInfo.bg}`}>
                <BadgeIcon className="w-3 h-3" />
                <span>{badgeInfo.label}</span>
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getPriorityBadgeClass(priority)}`}>
                Prioritas: {priority}
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                Keyakinan Sinyal: <strong className="text-gray-900">{confidence}</strong>
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
              {bottleneckTitle}
            </h3>

            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
              {headlineSummary}
            </p>

            {/* Conflict Resolution: Secondary Issue Notification */}
            {secondaryIssue && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-orange-50/80 border border-orange-200 text-xs text-orange-900 font-medium">
                <Layers className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Isu Sekunder Terdeteksi: </span>
                  <span>{secondaryIssue}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDebugOpen(!isDebugOpen)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold border border-gray-300 transition-colors cursor-pointer"
              title="Toggle Developer Debug Engine Panel"
            >
              <Terminal className="w-3.5 h-3.5 text-gray-600" />
              <span>Debug Engine</span>
              {isDebugOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={onOpenAiConsultant}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Analisis dengan AI</span>
            </button>
          </div>
        </div>

        {/* 4 Stage Health Quick Status Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-200/60">
          {stages.map((st) => {
            const isStageProblem = st.status === 'PROBLEM';
            const isStageMonitor = st.status === 'MONITOR';
            return (
              <div 
                key={st.stageName}
                className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isStageProblem 
                    ? 'bg-red-50/80 border-red-200' 
                    : isStageMonitor 
                    ? 'bg-amber-50/60 border-amber-200' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-900">{st.stageName}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                    isStageProblem ? 'text-red-700 bg-red-100' : isStageMonitor ? 'text-amber-700 bg-amber-100' : 'text-emerald-700 bg-emerald-100'
                  }`}>
                    {st.status}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1 font-mono">
                  {st.highlightText}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Developer Debug Panel (Toggleable) */}
      {isDebugOpen && (
        <div className="p-4 sm:p-5 bg-slate-900 text-slate-100 border-b border-slate-800 text-xs font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-100">Deterministic Diagnosis Engine Inspector</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">DEV MODE</span>
            </div>
            <button
              type="button"
              onClick={handleRunScenarios}
              disabled={isRunningTests}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isRunningTests ? 'Menjalankan...' : 'Jalankan 14 Skenario Uji (A - N)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-slate-400 uppercase tracking-wider text-[10px] mb-1 font-sans font-bold">
                Output Sinyal Saat Ini:
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div><span className="text-slate-500">primaryBottleneck:</span> <span className="text-emerald-400 font-bold">{primaryBottleneck}</span></div>
                <div><span className="text-slate-500">confidence:</span> <span className="text-amber-400">{confidence}</span></div>
                <div><span className="text-slate-500">priority:</span> <span className="text-cyan-400">{priority}</span></div>
                <div><span className="text-slate-500">secondaryIssue:</span> <span className="text-slate-300">{secondaryIssue || 'null (tidak ada konflik)'}</span></div>
              </div>
            </div>

            <div>
              <div className="text-slate-400 uppercase tracking-wider text-[10px] mb-1 font-sans font-bold">
                Bukti Perhitungan Terdaftar:
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1 max-h-32 overflow-y-auto">
                {evidence.map((ev, i) => (
                  <div key={i} className="text-slate-300 text-[11px] truncate" title={ev}>
                    &bull; {ev}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scenario Test Results Table */}
          {scenarioResults && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans font-bold text-slate-200">
                  Hasil Uji Skenario Deterministik ({scenarioResults.passedCount} / {scenarioResults.total} Lulus):
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-sans font-bold ${
                  scenarioResults.allPassed ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
                }`}>
                  {scenarioResults.allPassed ? 'SEMUA SKENARIO LULUS (100%)' : 'ADA SKENARIO GAGAL'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {scenarioResults.results.map((sc) => (
                  <div 
                    key={sc.scenarioId} 
                    className={`p-2 rounded-lg border ${
                      sc.passed ? 'bg-slate-950/80 border-emerald-900/60' : 'bg-red-950/80 border-red-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-[11px]">{sc.name.split('—')[0]}</span>
                      <span className={`text-[10px] font-bold px-1.5 rounded ${
                        sc.passed ? 'text-emerald-400 bg-emerald-950' : 'text-red-400 bg-red-900'
                      }`}>
                        {sc.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Expected: <span className="text-slate-300">{sc.expected}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Actual: <span className="text-emerald-300">{sc.actual}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Embedded 7-Stage Funnel Flow Visualization */}
      <div className="p-5 sm:p-6 border-b border-gray-100 bg-[#FAFBFD]">
        <FunnelVisualization 
          metrics={metrics}
          funnelStages={funnelStages}
          biggestDropoffStage={metrics.biggestDropoffStage}
          onNavigateToLandingPage={onNavigateToLandingPages}
        />
      </div>

      {/* Root Cause & Prescriptive Action Plan */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white">
        {/* Left Column: Why This Happened & Evidence */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Kenapa Kemungkinan Ini Terjadi?
            </h4>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              {detailedReason}
            </p>
          </div>

          {evidence && evidence.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
              <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-2">
                Bukti Metrik Terverifikasi:
              </div>
              <ul className="space-y-1.5 text-xs text-gray-700">
                {evidence.map((ev, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Prescriptive Guidance (Do & Don't) */}
        <div className="space-y-3.5">
          {/* Action To Do */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs sm:text-sm mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tindakan yang Sebaiknya Dilakukan:</span>
            </div>
            <p className="text-emerald-800 leading-relaxed font-medium">
              {recommendedAction}
            </p>
          </div>

          {/* Don't Do Yet */}
          <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 text-xs">
            <div className="flex items-center gap-2 font-bold text-red-900 text-xs sm:text-sm mb-1">
              <Ban className="w-4 h-4 text-red-600 shrink-0" />
              <span>JANGAN Dilakukan Terlebih Dahulu:</span>
            </div>
            <p className="text-red-800 leading-relaxed font-medium">
              {dontDoYet}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
