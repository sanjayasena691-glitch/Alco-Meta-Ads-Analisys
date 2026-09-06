import React, { useState } from 'react';
import { 
  Compass, 
  Sparkles, 
  ChevronRight, 
  AlertOctagon, 
  TrendingUp, 
  Eye, 
  CheckCircle, 
  HelpCircle,
  Filter,
  ArrowRight
} from 'lucide-react';
import { RecommendationCardItem, RecommendationPriority } from '../../types';

interface RecommendationCenterProps {
  recommendations: RecommendationCardItem[];
  onViewAiAnalysis: (item: RecommendationCardItem) => void;
}

export const RecommendationCenter: React.FC<RecommendationCenterProps> = ({
  recommendations,
  onViewAiAnalysis,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories: { id: string; label: string; count: number; badgeColor: string }[] = [
    { id: 'ALL', label: 'Semua Rekomendasi', count: recommendations.length, badgeColor: 'bg-slate-100 text-slate-700' },
    { id: 'HIGH_PRIORITY', label: '🔴 High Priority', count: recommendations.filter((r) => r.priority === 'HIGH_PRIORITY').length, badgeColor: 'bg-rose-100 text-rose-800' },
    { id: 'OPTIMIZATION', label: '🟠 Optimization', count: recommendations.filter((r) => r.priority === 'OPTIMIZATION').length, badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'MONITOR', label: '🟡 Monitor', count: recommendations.filter((r) => r.priority === 'MONITOR').length, badgeColor: 'bg-yellow-100 text-yellow-800' },
    { id: 'MAINTAIN', label: '🟢 Maintain', count: recommendations.filter((r) => r.priority === 'MAINTAIN').length, badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'NOT_ENOUGH_DATA', label: '⚪ Not Enough Data', count: recommendations.filter((r) => r.priority === 'NOT_ENOUGH_DATA').length, badgeColor: 'bg-slate-100 text-slate-700' },
  ];

  const filtered = selectedCategory === 'ALL'
    ? recommendations
    : recommendations.filter((r) => r.priority === selectedCategory);

  const getCategoryMeta = (cat: RecommendationPriority) => {
    switch (cat) {
      case 'HIGH_PRIORITY':
        return {
          label: 'High Priority',
          sub: 'Masalah yang berpotensi memboroskan budget langsung',
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          border: 'border-rose-200 bg-rose-50/20',
          icon: AlertOctagon,
        };
      case 'OPTIMIZATION':
        return {
          label: 'Optimization',
          sub: 'Rekomendasi peningkatan hasil & peremajaan materi',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          border: 'border-amber-200 bg-amber-50/20',
          icon: TrendingUp,
        };
      case 'MONITOR':
        return {
          label: 'Monitor',
          sub: 'Perlu dipantau 1 - 2 hari sebelum ambil tindakan',
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          border: 'border-yellow-200 bg-yellow-50/20',
          icon: Eye,
        };
      case 'MAINTAIN':
        return {
          label: 'Maintain',
          sub: 'Performa sudah optimal dalam target, jangan diubah',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          border: 'border-emerald-200 bg-emerald-50/20',
          icon: CheckCircle,
        };
      case 'NOT_ENOUGH_DATA':
      default:
        return {
          label: 'Not Enough Data',
          sub: 'Data masih baru dalam learning phase, hindari panik',
          badge: 'bg-slate-100 text-slate-800 border-slate-300',
          border: 'border-slate-200 bg-slate-50/20',
          icon: HelpCircle,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
                <Compass className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Recommendation Center
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Daftar rekomendasi berbasis logika rule engine dan konteks bisnis untuk memandu advertiser 
              dalam mengambil keputusan yang tepat waktu dan efisien.
            </p>
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedCategory === c.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <span>{c.label.split(' ')[1] || c.label}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/20">
                  {c.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-3.5">
        {filtered.map((item) => {
          const meta = getCategoryMeta(item.priority);
          const Icon = meta.icon;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 bg-white transition-all hover:shadow-xs ${meta.border}`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Category & Entity Tag */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                      <Icon className="w-3 h-3" />
                      <span>{meta.label}</span>
                    </span>

                    <span className="text-xs font-bold text-slate-900">
                      [{item.entityType.toUpperCase()}] {item.entityName}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      Confidence: <strong className="text-slate-700">{item.confidence}</strong>
                    </span>
                  </div>

                  {/* Problem Statement */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {item.problem}
                    </h3>
                  </div>

                  {/* Evidence Points */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Bukti Data Metrik:
                    </span>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                      {item.evidence.map((ev, idx) => (
                        <li key={idx} className="font-medium">
                          {ev}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Action */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-0.5">
                      Rekomendasi Tindakan:
                    </span>
                    <p className="text-emerald-950 font-semibold leading-relaxed">
                      {item.recommendedAction}
                    </p>
                  </div>
                </div>

                {/* Right Action Button */}
                <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => onViewAiAnalysis(item)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all hover:scale-[1.02]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View AI Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            Tidak ada rekomendasi dalam kategori ini saat ini.
          </div>
        )}
      </div>
    </div>
  );
};
