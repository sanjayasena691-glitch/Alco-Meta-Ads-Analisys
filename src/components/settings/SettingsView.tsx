import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  HelpCircle, 
  CheckCircle2, 
  Bell, 
  User, 
  Languages, 
  Save
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [profileType, setProfileType] = useState('Penjual Produk Digital');
  const [sensitivity, setSensitivity] = useState('Medium');
  const [beginnerMode, setBeginnerMode] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Pengaturan Aplikasi</h2>
            <p className="text-xs text-slate-500">
              Sesuaikan preferensi analisis, notifikasi anomali, dan profil bisnis Anda
            </p>
          </div>
        </div>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan preferensi berhasil disimpan!</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6 text-xs">
        {/* Profile */}
        <div className="space-y-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <User className="w-4 h-4 text-sky-600" />
            <span>Karakteristik Advertiser</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Tipe Bisnis / Penjualan
              </label>
              <select
                value={profileType}
                onChange={(e) => setProfileType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="Penjual Produk Digital">Penjual Produk Digital (Ebook, Course, SaaS)</option>
                <option value="Small Business Owner">Small Business Owner (UMKM / Jasa)</option>
                <option value="E-Commerce Physical Products">E-Commerce Toko Online Produk Fisik</option>
                <option value="Pemula Meta Ads">Pemula Meta Ads / Belajar Iklan</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Bahasa Diagnosis AI
              </label>
              <select
                defaultValue="id"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="id">Bahasa Indonesia (Ramah Pemula)</option>
                <option value="en">English (Technical)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Beginner Protection & Jargon Explanations */}
        <div className="space-y-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>Bantuan Pemula &amp; Glosarium Istilah</span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div>
              <span className="font-semibold text-slate-800 block">
                Mode Glosarium Istilah Aktif
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Tampilkan ikon bantuan singkat di samping istilah teknis (ROAS, CPA, CTR, Frequency, CPM)
              </p>
            </div>
            <input
              type="checkbox"
              checked={beginnerMode}
              onChange={(e) => setBeginnerMode(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Anomaly Detection Sensitivity */}
        <div className="space-y-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Bell className="w-4 h-4 text-amber-600" />
            <span>Sensitivitas Deteksi Anomali</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {['Konservatif', 'Medium', 'Sensitif'].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSensitivity(level)}
                className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                  sensitivity === level
                    ? 'bg-sky-50 border-sky-300 text-sky-800 ring-1 ring-sky-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Safety Protocol Verification */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-emerald-950 text-xs block">
              Prinsip Keselamatan AI Aktif
            </span>
            <p className="text-emerald-900 text-[11px] leading-relaxed">
              ALCO Meta Ads Analyst dirancang untuk mendampingi dan mendiagnosis secara objektif. 
              Sistem tidak pernah melakukan perubahan campaign, menaikkan/menurunkan budget, atau mematikan iklan secara otomatis di Meta Ads Manager Anda.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
