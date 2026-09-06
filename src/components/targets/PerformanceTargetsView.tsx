import React, { useState } from 'react';
import { 
  Target, 
  Save, 
  CheckCircle2, 
  HelpCircle, 
  Info, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { BusinessTargets } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { JargonTooltip } from '../common/JargonTooltip';

interface PerformanceTargetsViewProps {
  targets: BusinessTargets;
  onSaveTargets: (newTargets: BusinessTargets) => void;
}

export const PerformanceTargetsView: React.FC<PerformanceTargetsViewProps> = ({
  targets,
  onSaveTargets,
}) => {
  const [formData, setFormData] = useState<BusinessTargets>({ ...targets });
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTargets(formData);
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 3000);
  };

  const handleResetDefault = () => {
    const defaults: BusinessTargets = {
      productName: 'ALCO Creative System',
      productPrice: 99_000,
      targetCpa: 30_000,
      breakEvenCpa: 55_000,
      targetRoas: 3.0,
      dailyBudget: 250_000,
      targetCtr: 1.8,
    };
    setFormData(defaults);
    onSaveTargets(defaults);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Informative Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 text-sky-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Target Kinerja Bisnis (Custom Benchmark)</h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
              ALCO Meta Ads Analyst <strong>tidak menggunakan benchmark universal satu ukuran</strong>. 
              Sistem mengevaluasi kesehatan campaign, mendeteksi CPA Spike, dan memberikan rekomendasi AI 
              berdasarkan harga produk serta batas toleransi laba bisnis Anda sendiri.
            </p>
          </div>
        </div>
      </div>

      {showSavedNotification && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Target bisnis berhasil diperbarui! Seluruh evaluasi rule engine dan diagnosis AI langsung disinkronkan.</span>
        </div>
      )}

      {/* Target Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Nama Produk / Layanan
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="Contoh: ALCO Creative System"
            />
            <p className="text-[11px] text-slate-400">Nama penawaran yang dipromosikan dalam iklan.</p>
          </div>

          {/* Product Price */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Harga Jual Produk (IDR)</span>
              <span className="text-[11px] font-semibold text-slate-500">{formatRupiah(formData.productPrice)}</span>
            </label>
            <input
              type="number"
              value={formData.productPrice}
              onChange={(e) => setFormData({ ...formData, productPrice: Number(e.target.value) })}
              required
              min={1000}
              step={1000}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400">Harga satuan yang dibayar oleh customer saat checkout.</p>
          </div>

          {/* Target CPA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Target CPA (Biaya per Pembelian)</span>
                <JargonTooltip termKey="CPA" />
              </label>
              <span className="text-[11px] font-semibold text-emerald-600">{formatRupiah(formData.targetCpa)}</span>
            </div>
            <input
              type="number"
              value={formData.targetCpa}
              onChange={(e) => setFormData({ ...formData, targetCpa: Number(e.target.value) })}
              required
              min={1000}
              step={1000}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400">Biaya iklan ideal per 1 pembelian agar menghasilkan margin profit sehat.</p>
          </div>

          {/* Break-Even CPA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Break-Even CPA (Batas Toleransi Rugi)</span>
                <JargonTooltip termKey="BreakEvenCPA" />
              </label>
              <span className="text-[11px] font-semibold text-rose-600">{formatRupiah(formData.breakEvenCpa)}</span>
            </div>
            <input
              type="number"
              value={formData.breakEvenCpa}
              onChange={(e) => setFormData({ ...formData, breakEvenCpa: Number(e.target.value) })}
              required
              min={1000}
              step={1000}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400">Jika CPA melebihi angka ini, iklan mengalami kerugian finansial.</p>
          </div>

          {/* Target ROAS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Target ROAS</span>
                <JargonTooltip termKey="ROAS" />
              </label>
              <span className="text-[11px] font-semibold text-indigo-600">{formData.targetRoas}x</span>
            </div>
            <input
              type="number"
              value={formData.targetRoas}
              onChange={(e) => setFormData({ ...formData, targetRoas: Number(e.target.value) })}
              required
              min={0.5}
              max={20}
              step={0.1}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400">Target kelipatan omzet dibanding pengeluaran iklan.</p>
          </div>

          {/* Daily Budget */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Alokasi Budget Harian (IDR)</span>
              <span className="text-[11px] font-semibold text-slate-500">{formatRupiah(formData.dailyBudget)}</span>
            </label>
            <input
              type="number"
              value={formData.dailyBudget}
              onChange={(e) => setFormData({ ...formData, dailyBudget: Number(e.target.value) })}
              required
              min={10000}
              step={10000}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400">Batas toleransi belanja harian untuk deteksi lonjakan spend.</p>
          </div>

          {/* Target CTR (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Target CTR (%) &bull; Opsional</span>
                <JargonTooltip termKey="CTR" />
              </label>
              <span className="text-[11px] font-semibold text-slate-500">{formData.targetCtr || 1.8}%</span>
            </div>
            <input
              type="number"
              value={formData.targetCtr || 1.8}
              onChange={(e) => setFormData({ ...formData, targetCtr: Number(e.target.value) })}
              min={0.1}
              max={15}
              step={0.1}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400">Rasio klik minimum yang diharapkan untuk materi promosi.</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembalikan Contoh Default</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all hover:scale-[1.01]"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Target Kinerja</span>
          </button>
        </div>
      </form>
    </div>
  );
};
