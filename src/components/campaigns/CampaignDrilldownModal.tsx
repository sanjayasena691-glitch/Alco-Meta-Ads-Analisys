import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  Sparkles, 
  Layers, 
  Video, 
  Target, 
  DollarSign, 
  TrendingUp, 
  Info,
  Flame,
  ArrowLeft
} from 'lucide-react';
import { Campaign, AdSet, AdCreative } from '../../types';
import { formatRupiah, formatRoas, formatFrequency, formatPercent, formatNumber } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

interface CampaignDrilldownModalProps {
  campaign: Campaign | null;
  onClose: () => void;
  onAnalyzeEntity: (name: string, type: 'campaign' | 'adset' | 'ad', metrics: any) => void;
}

export const CampaignDrilldownModal: React.FC<CampaignDrilldownModalProps> = ({
  campaign,
  onClose,
  onAnalyzeEntity,
}) => {
  const [selectedAdSet, setSelectedAdSet] = useState<AdSet | null>(null);
  const [selectedAd, setSelectedAd] = useState<AdCreative | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'adsets' | 'ads'>('overview');

  if (!campaign) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header & Breadcrumb */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <span>Ad Account</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <button 
                type="button" 
                onClick={() => { setSelectedAdSet(null); setSelectedAd(null); setActiveTab('overview'); }}
                className="hover:text-sky-600 font-medium truncate max-w-[140px]"
              >
                {campaign.name}
              </button>
              {selectedAdSet && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <button 
                    type="button" 
                    onClick={() => { setSelectedAd(null); setActiveTab('ads'); }}
                    className="hover:text-sky-600 font-medium truncate max-w-[120px]"
                  >
                    {selectedAdSet.name}
                  </button>
                </>
              )}
              {selectedAd && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                    {selectedAd.name}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-md sm:max-w-xl">
                {selectedAd ? selectedAd.name : selectedAdSet ? selectedAdSet.name : campaign.name}
              </h2>
              <StatusBadge status={selectedAd?.status || selectedAdSet?.status || campaign.status} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const entity = selectedAd || selectedAdSet || campaign;
                const type = selectedAd ? 'ad' : selectedAdSet ? 'adset' : 'campaign';
                onAnalyzeEntity(entity.name, type, entity.metrics);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:from-sky-700 hover:to-indigo-700"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Diagnosa AI</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 bg-white text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setSelectedAdSet(null); setSelectedAd(null); setActiveTab('overview'); }}
            className={`pb-2.5 px-2 border-b-2 transition-colors ${
              activeTab === 'overview' && !selectedAdSet && !selectedAd
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Campaign Overview
          </button>
          <button
            type="button"
            onClick={() => { setSelectedAd(null); setActiveTab('adsets'); }}
            className={`pb-2.5 px-2 border-b-2 transition-colors ${
              activeTab === 'adsets' || selectedAdSet
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ad Sets ({campaign.adSets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ads')}
            className={`pb-2.5 px-2 border-b-2 transition-colors ${
              activeTab === 'ads' || selectedAd
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ads / Creatives ({campaign.adSets.flatMap((as) => as.ads).length})
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-slate-50/40">
          {/* Active Level Metrics Breakdown */}
          {(() => {
            const currentEntity = selectedAd || selectedAdSet || campaign;
            const m = currentEntity.metrics;

            return (
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Matriks Kinerja Detail
                    </span>
                    <span className="text-xs text-slate-400">({currentEntity.name})</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">Spend</span>
                    <span className="font-bold text-slate-900 text-sm">{formatRupiah(m.spend)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">Revenue</span>
                    <span className="font-bold text-emerald-700 text-sm">{formatRupiah(m.revenue)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">ROAS</span>
                    <span className="font-bold text-emerald-600 text-sm">{formatRoas(m.roas)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">Purchases</span>
                    <span className="font-bold text-slate-900 text-sm">{m.purchases} order</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">CPA</span>
                    <span className={`font-bold text-sm ${m.cpa > 45_000 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {formatRupiah(m.cpa)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">CTR</span>
                    <span className="font-semibold text-slate-900 text-sm">{m.ctr}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">CPC</span>
                    <span className="font-semibold text-slate-900 text-sm">{formatRupiah(m.cpc)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">CPM</span>
                    <span className="font-semibold text-slate-900 text-sm">{formatRupiah(m.cpm)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">Frequency</span>
                    <span className="font-semibold text-slate-900 text-sm">{formatFrequency(m.frequency)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">Impressions / Reach</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {formatNumber(m.impressions)} / {formatNumber(m.reach)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Ad Sets List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Daftar Ad Sets
              </h4>
              <span className="text-xs text-slate-400">{campaign.adSets.length} Ad Sets</span>
            </div>

            <div className="space-y-2.5">
              {campaign.adSets.map((as) => (
                <div
                  key={as.id}
                  className={`p-4 rounded-xl border transition-all ${
                    selectedAdSet?.id === as.id
                      ? 'bg-sky-50/60 border-sky-300 ring-1 ring-sky-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-600" />
                      <span className="font-bold text-xs text-slate-900">{as.name}</span>
                      <StatusBadge status={as.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-medium">
                        Targeting: <span className="text-slate-700">{as.targetingSummary}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedAdSet(selectedAdSet?.id === as.id ? null : as)}
                        className="px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 rounded-md transition-colors"
                      >
                        {selectedAdSet?.id === as.id ? 'Tutup Rincian' : 'Lihat Ads'}
                      </button>
                    </div>
                  </div>

                  {/* AdSet Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Spend</span>
                      <span className="font-semibold text-slate-900">{formatRupiah(as.metrics.spend)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">ROAS</span>
                      <span className="font-bold text-emerald-600">{formatRoas(as.metrics.roas)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Purchases</span>
                      <span className="font-semibold text-slate-900">{as.metrics.purchases} orders</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">CPA</span>
                      <span className={`font-semibold ${as.metrics.cpa > 45_000 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatRupiah(as.metrics.cpa)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">CTR</span>
                      <span className="font-semibold text-slate-900">{as.metrics.ctr}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Frequency</span>
                      <span className="font-semibold text-slate-900">{formatFrequency(as.metrics.frequency)}</span>
                    </div>
                  </div>

                  {/* Ads Under this AdSet (if opened or tab active) */}
                  {(selectedAdSet?.id === as.id || activeTab === 'ads') && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Materi Iklan (Ads / Creatives) di Ad Set ini:
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {as.ads.map((ad) => (
                          <div
                            key={ad.id}
                            className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              ad.status === 'PROBLEM'
                                ? 'bg-rose-50/40 border-rose-200'
                                : ad.isWinner
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : 'bg-slate-50/60 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 mt-0.5">
                                <Video className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-slate-900">{ad.name}</span>
                                  <StatusBadge status={ad.status} size="sm" />
                                  {ad.isWinner && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                      Winner
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 italic">
                                  Hook: {ad.hookText}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs shrink-0">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">ROAS & CPA</span>
                                <span className="font-bold text-slate-900">
                                  {formatRoas(ad.metrics.roas)} &bull; {formatRupiah(ad.metrics.cpa)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">CTR & Freq</span>
                                <span className="font-medium text-slate-700">
                                  {ad.metrics.ctr}% &bull; {formatFrequency(ad.metrics.frequency)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onAnalyzeEntity(ad.name, 'ad', ad.metrics)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-sky-700 flex items-center gap-1 shadow-2xs"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Diagnosa</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-sky-600" />
            <span>Semua aksi dianjurkan dieksekusi langsung di Meta Ads Manager resmi.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
