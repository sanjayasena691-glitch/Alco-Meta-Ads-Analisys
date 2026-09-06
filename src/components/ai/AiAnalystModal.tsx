import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Layers, 
  HelpCircle, 
  RefreshCw, 
  Lightbulb, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Campaign, BusinessTargets, StructuredAiAnalysis, AdSet, AdCreative } from '../../types';
import { evaluateEntityHealth } from '../../engine/rules/ruleEvaluator';
import { requestAiDiagnosis } from '../../services/ai/aiAnalystService';
import { AiExplanationCard } from './AiExplanationCard';

interface AiAnalystModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: Campaign[];
  targets: BusinessTargets;
  initialEntity?: {
    name: string;
    type: 'account' | 'campaign' | 'adset' | 'ad' | 'landing_page' | 'funnel';
    metrics: any;
    previousMetrics?: any;
    landingPageMetrics?: any;
    landingPageEvaluation?: any;
  } | null;
  landingPages?: any[];
  funnelDiagnosis?: any;
}

export const AiAnalystModal: React.FC<AiAnalystModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  targets,
  initialEntity,
  landingPages = [],
  funnelDiagnosis,
}) => {
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    initialEntity?.name || campaigns[0]?.id || ''
  );
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<StructuredAiAnalysis | null>(null);

  if (!isOpen) return null;

  // Flatten all entities (Funnel, Landing Pages, Campaigns, AdSets, Ads)
  const allSelectableItems: { 
    id: string; 
    name: string; 
    type: 'account' | 'campaign' | 'adset' | 'ad' | 'landing_page' | 'funnel'; 
    entity: any;
    extraData?: any;
  }[] = [];

  // 1. Overall Funnel item
  if (funnelDiagnosis) {
    allSelectableItems.push({
      id: 'funnel_overview',
      name: '🎯 [Funnel Diagnosis] End-to-End Meta Ads & Landing Page',
      type: 'funnel',
      entity: {
        name: 'Funnel & Conversion Flow',
        metrics: funnelDiagnosis.metrics,
      },
      extraData: { funnelDiagnosis },
    });
  }

  // 2. Landing Pages
  landingPages.forEach((lp) => {
    allSelectableItems.push({
      id: lp.profile.id,
      name: `🌐 [Landing Page] ${lp.profile.name}`,
      type: 'landing_page',
      entity: {
        name: lp.profile.name,
        metrics: lp.metrics,
      },
      extraData: { lp },
    });
  });
  
  // 3. Campaigns, AdSets, Ads
  campaigns.forEach((c) => {
    allSelectableItems.push({ id: c.id, name: `[Campaign] ${c.name}`, type: 'campaign', entity: c });
    c.adSets.forEach((as) => {
      allSelectableItems.push({ id: as.id, name: `  ↳ [AdSet] ${as.name}`, type: 'adset', entity: as });
      as.ads.forEach((ad) => {
        allSelectableItems.push({ id: ad.id, name: `    ↳ [Ad] ${ad.name}`, type: 'ad', entity: ad });
      });
    });
  });

  const handleRunDiagnosis = async (questionToAsk?: string) => {
    setIsLoading(true);
    const selectedItem = allSelectableItems.find((i) => i.id === selectedEntityId) || allSelectableItems[0];
    
    if (!selectedItem) {
      setIsLoading(false);
      return;
    }

    const currentEntity = selectedItem.entity;
    const currentMetrics = currentEntity.metrics;
    const previousMetrics = currentEntity.previousMetrics || currentMetrics;
    const evaluation = evaluateEntityHealth(currentMetrics, previousMetrics, targets);

    const diagnosis = await requestAiDiagnosis({
      entityId: selectedItem.id,
      entityName: currentEntity.name,
      entityType: selectedItem.type,
      metrics: currentMetrics,
      previousMetrics,
      evaluation,
      targets,
      userCustomQuestion: questionToAsk || customQuestion,
      funnelEvaluation: funnelDiagnosis,
      landingPageMetrics: selectedItem.extraData?.lp?.metrics,
      landingPageEvaluation: selectedItem.extraData?.lp?.evaluation,
    });

    setAnalysisResult(diagnosis);
    setIsLoading(false);
  };

  const sampleQuestions = [
    'Apakah masalah CPA ini karena iklan atau landing page?',
    'Kenapa drop-off link click ke LP view sangat tinggi?',
    'Apakah performa sudah cukup stabil untuk scale budget?',
    'Bagaimana cara mengatasi creative fatigue yang terdeteksi?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-sky-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">ALCO AI Ads Consultant</h2>
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                  Gemini-Powered
                </span>
              </div>
              <p className="text-xs text-sky-200">
                Diagnosis objektif penyebab penurunan performa dan panduan aksi nyata
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-slate-50/50">
          {/* Entity Selector & Question Form */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">
                Pilih Entitas yang Ingin Didiagnosis:
              </label>
              <span className="text-[11px] text-slate-400">
                Pilih Campaign, Ad Set, atau Creative spesifik
              </span>
            </div>

            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              {allSelectableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            {/* Beginner Quick Questions */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Pertanyaan Cepat Rekomendasi:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCustomQuestion(q);
                      handleRunDiagnosis(q);
                    }}
                    className="text-left text-[11px] font-medium px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 rounded-lg transition-colors border border-slate-200/80"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Question input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Tulis pertanyaan spesifik Anda (contoh: Kenapa CTR turun setelah 3 hari?)..."
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunDiagnosis()}
                className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => handleRunDiagnosis()}
                disabled={isLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Mulai Analisis</span>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
              <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800">Menghubungkan Data &amp; AI Analyst...</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Mengevaluasi sinyal metrik, ambang batas toleransi, dan menyusun panduan rekomendasi terstruktur.
                </p>
              </div>
            </div>
          )}

          {/* Diagnosis Result */}
          {analysisResult && !isLoading && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <AiExplanationCard analysis={analysisResult} />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>AI memberikan pertimbangan objektif, eksekusi tetap aman di tangan pengiklan.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
