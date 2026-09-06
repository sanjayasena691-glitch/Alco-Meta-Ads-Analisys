import React, { useState } from 'react';
import { 
  RefreshCw, 
  Calendar, 
  Sparkles, 
  Target, 
  ChevronDown, 
  Building2,
  CheckCircle2
} from 'lucide-react';
import { TimePeriod, BusinessTargets } from '../../types';
import { formatRupiah } from '../../utils/formatters';

interface TopHeaderProps {
  currentPeriod: TimePeriod;
  onSelectPeriod: (period: TimePeriod) => void;
  lastSyncedAt: string;
  isSyncing: boolean;
  onRefreshData: () => void;
  targets: BusinessTargets;
  onOpenTargets: () => void;
  onOpenAiAnalyst: () => void;
  accountName: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentPeriod,
  onSelectPeriod,
  lastSyncedAt,
  isSyncing,
  onRefreshData,
  targets,
  onOpenTargets,
  onOpenAiAnalyst,
  accountName,
}) => {
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  const periods: { id: TimePeriod; label: string }[] = [
    { id: 'today', label: 'Today (Hari Ini)' },
    { id: 'yesterday', label: 'Yesterday (Kemarin)' },
    { id: 'last_3_days', label: 'Last 3 Days (3 Hari Terakhir)' },
    { id: 'last_7_days', label: 'Last 7 Days (7 Hari Terakhir)' },
    { id: 'last_14_days', label: 'Last 14 Days (14 Hari Terakhir)' },
    { id: 'last_30_days', label: 'Last 30 Days (30 Hari Terakhir)' },
  ];

  const currentLabel = periods.find((p) => p.id === currentPeriod)?.label || 'Last 7 Days';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 lg:px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Account indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-gray-900 truncate max-w-[160px] sm:max-w-[220px]">
              {accountName}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          </div>

          {/* Quick Target Context badge */}
          <button
            type="button"
            onClick={onOpenTargets}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg border border-transparent hover:border-indigo-100 transition-colors cursor-pointer"
            title="Klik untuk mengubah target bisnis"
          >
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            <span>Target: <strong>{targets.productName}</strong> (CPA &le; {formatRupiah(targets.targetCpa, true)})</span>
          </button>
        </div>

        {/* Right: Sync status, Period Selector & AI CTA */}
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefreshData}
            disabled={isSyncing}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            title="Sinkronkan data terbaru dari Meta Ads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-gray-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Period Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 opacity-80" />
              <span className="truncate max-w-[120px] sm:max-w-none">{currentLabel.split(' (')[0]}</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {periodDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setPeriodDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-40 text-xs">
                  <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                    Pilih Rentang Waktu
                  </div>
                  {periods.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelectPeriod(p.id);
                        setPeriodDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                        currentPeriod === p.id ? 'font-semibold text-indigo-600 bg-indigo-50/70' : 'text-gray-700'
                      }`}
                    >
                      <span>{p.label}</span>
                      {currentPeriod === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* AI Analyst Primary Button */}
          <button
            type="button"
            onClick={onOpenAiAnalyst}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>AI Analyst</span>
          </button>
        </div>
      </div>
    </header>
  );
};
