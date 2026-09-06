import React from 'react';
import { 
  Sparkles, 
  AlertCircle, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  ShieldCheck,
  Eye,
  Layers
} from 'lucide-react';
import { StructuredAiAnalysis } from '../../types';

interface AiExplanationCardProps {
  analysis: StructuredAiAnalysis;
}

export const AiExplanationCard: React.FC<AiExplanationCardProps> = ({ analysis }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs space-y-0">
      {/* Card Header */}
      <div className="p-4 sm:p-5 bg-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-white/10 text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-bold tracking-wider text-indigo-300 uppercase">
              ALCO AI Diagnosis
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white font-medium">
              {analysis.entityType.toUpperCase()}: {analysis.entityName}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Analisis Diagnosis & Rekomendasi Terstruktur
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-indigo-200 text-xs">
            Confidence: <strong className="text-white">{analysis.confidence}</strong>
          </span>
          <span className="text-indigo-300 text-[11px] hidden sm:inline font-mono">
            {analysis.generatedAt}
          </span>
        </div>
      </div>

      {/* Structured Content */}
      <div className="p-5 space-y-3 text-xs">
        {/* Highlight: Where the problem is / Primary Bottleneck */}
        {(analysis.whereTheProblemIs || analysis.primaryBottleneck) && (
          <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                Akar Masalah Utama:
              </span>
              <span className="text-xs font-extrabold text-indigo-950">
                {analysis.whereTheProblemIs || analysis.primaryBottleneck}
              </span>
            </div>
            {analysis.primaryBottleneck && (
              <span className="text-[10px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 shrink-0">
                Category: {analysis.primaryBottleneck}
              </span>
            )}
          </div>
        )}

        {/* Secondary Issue Notification */}
        {analysis.secondaryIssue && (
          <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
            <Layers className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Isu Sekunder Terdeteksi: </span>
              <span>{analysis.secondaryIssue}</span>
            </div>
          </div>
        )}

        {/* 1. What Happened */}
        <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-[11px] uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>1. What Happened (Apa yang Terjadi)</span>
          </div>
          <p className="text-gray-700 leading-relaxed text-xs font-medium pl-5.5">
            {analysis.whatHappened}
          </p>
        </div>

        {/* 2. Why / Possible Cause */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-100 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-[11px] uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>2. Why / Possible Cause (Alasan & Kemungkinan Penyebab)</span>
          </div>
          <p className="text-amber-900/90 leading-relaxed text-xs pl-5.5">
            {analysis.why || analysis.possibleCause}
          </p>
        </div>

        {/* 3. Evidence */}
        <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-[11px] uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>3. Evidence (Bukti Data Pendukung)</span>
          </div>
          <ul className="pl-6 space-y-1 list-disc list-outside text-gray-700 marker:text-indigo-500">
            {analysis.evidence.map((item, idx) => (
              <li key={idx} className="font-medium text-xs leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* 4. Recommended Action */}
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-[11px] uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>4. Recommended Action (Tindakan yang Disarankan)</span>
          </div>
          <div className="pl-5.5 text-emerald-950 font-semibold text-xs leading-relaxed">
            {analysis.recommendedAction}
          </div>
        </div>

        {/* 5. Don't Do Yet */}
        <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2 text-red-900 font-bold text-[11px] uppercase tracking-wider">
            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>5. Don't Do Yet (Hindari Tindakan Ini Dulu)</span>
          </div>
          <div className="pl-5.5 text-red-950 font-semibold text-xs leading-relaxed">
            {analysis.dontDoYet}
          </div>
        </div>

        {/* 6. Next Thing To Monitor */}
        {analysis.nextThingToMonitor && (
          <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-lg space-y-1.5">
            <div className="flex items-center gap-2 text-sky-900 font-bold text-[11px] uppercase tracking-wider">
              <Eye className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>6. Next Thing To Monitor (Yang Perlu Dipantau Selanjutnya)</span>
            </div>
            <div className="pl-5.5 text-sky-950 font-medium text-xs leading-relaxed">
              {analysis.nextThingToMonitor}
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between px-5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Analisis didasarkan pada perhitungan Rule Engine deterministik ALCO.</span>
        </div>
        <span className="text-[10px] font-mono uppercase text-gray-400">
          Source: {analysis.source}
        </span>
      </div>
    </div>
  );
};
