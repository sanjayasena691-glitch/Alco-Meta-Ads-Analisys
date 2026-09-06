import React, { useState } from 'react';
import { 
  Trophy, 
  AlertTriangle, 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  Layers, 
  HelpCircle,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { AdCreative, BusinessTargets } from '../../types';
import { calculateCreativeCompositeScore } from '../../engine/calculations/metrics';
import { formatRupiah, formatRoas, formatFrequency } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

interface CreativePerformanceViewProps {
  allCreatives: AdCreative[];
  targets: BusinessTargets;
  onAnalyzeCreative: (creative: AdCreative) => void;
}

export const CreativePerformanceView: React.FC<CreativePerformanceViewProps> = ({
  allCreatives,
  targets,
  onAnalyzeCreative,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'top' | 'underperforming'>('all');

  // Compute composite score for all creatives
  const scoredCreatives = allCreatives.map((ad) => {
    const score = calculateCreativeCompositeScore(ad, targets);
    return {
      ...ad,
      compositeScore: score,
    };
  });

  // Sort descending by composite score
  const sorted = [...scoredCreatives].sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));

  const topPerformers = sorted.filter((ad) => (ad.compositeScore || 0) >= 65);
  const underperformers = sorted.filter((ad) => (ad.compositeScore || 0) < 65 || ad.status === 'PROBLEM');

  const displayedList = activeTab === 'top' 
    ? topPerformers 
    : activeTab === 'underperforming' 
    ? underperformers 
    : sorted;

  return (
    <div className="space-y-6">
      {/* Header & Ranking Methodology Notice */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <Trophy className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Creative Performance Ranking
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Peringkat efektivitas materi iklan dihitung komprehensif berdasarkan kombinasi 
              <strong> ROAS, CPA, CTR, Pembelian, dan Spend</strong>. Tidak pernah menentukan winner hanya berdasarkan tingginya klik (CTR).
            </p>
          </div>

          {/* Tab Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start md:self-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({sorted.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('top')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'top'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Top Performing ({topPerformers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('underperforming')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'underperforming'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Underperforming ({underperformers.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Creative Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedList.map((ad, index) => {
          const isWinner = (ad.compositeScore || 0) >= 70;
          const isFatigueRisk = ad.metrics.frequency >= 3.0 && ad.metrics.ctr < 1.4;
          const isProblem = ad.status === 'PROBLEM';

          return (
            <div
              key={ad.id}
              className={`rounded-2xl border p-5 transition-all bg-white hover:shadow-xs flex flex-col justify-between ${
                isWinner
                  ? 'border-emerald-200 ring-1 ring-emerald-100'
                  : isProblem
                  ? 'border-rose-200 ring-1 ring-rose-100'
                  : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header Row: Rank Badge & Format */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1">
                      {ad.format === 'Video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                      <span>{ad.format}</span>
                    </span>
                    <StatusBadge status={ad.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isWinner && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Top Performer
                      </span>
                    )}
                    {isFatigueRisk && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Fatigue Risk
                      </span>
                    )}
                    {isProblem && !isFatigueRisk && (
                      <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Needs Attention
                      </span>
                    )}
                  </div>
                </div>

                {/* Creative Title & Hook */}
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1 mb-1">
                  {ad.name}
                </h3>
                <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4 line-clamp-2">
                  Hook: {ad.hookText}
                </p>

                {/* Core Metrics Matrix */}
                <div className="grid grid-cols-3 gap-2.5 text-xs mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium block">ROAS</span>
                    <span className={`text-base font-bold ${ad.metrics.roas >= 3.0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {formatRoas(ad.metrics.roas)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium block">CPA</span>
                    <span className={`text-base font-bold ${ad.metrics.cpa > targets.breakEvenCpa ? 'text-rose-600' : 'text-slate-900'}`}>
                      {formatRupiah(ad.metrics.cpa)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium block">CTR</span>
                    <span className="text-base font-bold text-slate-900">
                      {ad.metrics.ctr}%
                    </span>
                  </div>
                </div>

                {/* Supporting Metrics Bar */}
                <div className="flex items-center justify-between text-xs text-slate-500 py-2 border-t border-slate-100 mb-4">
                  <span>Spend: <strong className="text-slate-800">{formatRupiah(ad.metrics.spend)}</strong></span>
                  <span>Purchases: <strong className="text-slate-800">{ad.metrics.purchases} order</strong></span>
                  <span>Freq: <strong className="text-slate-800">{formatFrequency(ad.metrics.frequency)}</strong></span>
                  <span>Composite: <strong className="text-indigo-600">{ad.compositeScore}/100</strong></span>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Target CPA: {formatRupiah(targets.targetCpa)}
                </span>

                <button
                  type="button"
                  onClick={() => onAnalyzeCreative(ad)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 font-semibold text-xs rounded-xl transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Lihat Analisis AI</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
