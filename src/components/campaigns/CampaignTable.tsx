import React, { useState } from 'react';
import { 
  ChevronRight, 
  Search, 
  Filter, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Campaign, EntityStatus } from '../../types';
import { formatRupiah, formatRoas, formatFrequency } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

interface CampaignTableProps {
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  onAnalyzeCampaign: (campaign: Campaign) => void;
}

export const CampaignTable: React.FC<CampaignTableProps> = ({
  campaigns,
  onSelectCampaign,
  onAnalyzeCampaign,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
      {/* Table Controls */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
            Performa Campaign Meta Ads
          </h3>
          <p className="text-xs text-gray-500">
            Klik baris campaign untuk melihat rincian Ad Set hingga Creative
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari campaign..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-56"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="HEALTHY">🟢 Healthy</option>
            <option value="MONITOR">🟡 Monitor</option>
            <option value="PROBLEM">🔴 Problem</option>
            <option value="NOT_ENOUGH_DATA">⚪ Not Enough Data</option>
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Campaign</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Spend</th>
              <th className="py-3 px-3 text-right">Revenue</th>
              <th className="py-3 px-3 text-right">Purchases</th>
              <th className="py-3 px-3 text-right">CPA</th>
              <th className="py-3 px-3 text-right">ROAS</th>
              <th className="py-3 px-3 text-right">CTR</th>
              <th className="py-3 px-3 text-right">CPC</th>
              <th className="py-3 px-3 text-right">CPM</th>
              <th className="py-3 px-3 text-right">Freq</th>
              <th className="py-3 px-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCampaigns.map((camp) => (
              <tr
                key={camp.id}
                onClick={() => onSelectCampaign(camp)}
                className="hover:bg-gray-50/70 cursor-pointer transition-colors group"
              >
                <td className="py-3 px-4 font-semibold text-gray-900 max-w-[220px]">
                  <div className="truncate font-bold group-hover:text-indigo-600 transition-colors">
                    {camp.name}
                  </div>
                  <div className="text-[11px] text-gray-400 font-normal">
                    {camp.adSets.length} Ad Sets &bull; Budget:{' '}
                    {camp.budgetType === 'LIFETIME'
                      ? `${formatRupiah(camp.lifetimeBudget)} (Lifetime)`
                      : camp.dailyBudget !== null
                      ? `${formatRupiah(camp.dailyBudget)} (Daily)`
                      : 'N/A'}
                  </div>
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <StatusBadge status={camp.status} size="sm" />
                </td>
                <td className="py-3 px-3 text-right font-medium text-gray-800 whitespace-nowrap">
                  {formatRupiah(camp.metrics.spend)}
                </td>
                <td className="py-3 px-3 text-right font-medium text-gray-800 whitespace-nowrap">
                  {formatRupiah(camp.metrics.revenue)}
                </td>
                <td className="py-3 px-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                  {camp.metrics.purchases !== null ? camp.metrics.purchases : 'N/A'}
                </td>
                <td className="py-3 px-3 text-right font-medium whitespace-nowrap">
                  <span className={camp.metrics.cpa !== null && camp.metrics.cpa > 45_000 ? 'text-red-600 font-bold' : 'text-gray-800'}>
                    {formatRupiah(camp.metrics.cpa)}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-bold whitespace-nowrap">
                  <span className={camp.metrics.roas !== null && camp.metrics.roas >= 3.0 ? 'text-green-600' : camp.metrics.roas !== null && camp.metrics.roas < 1.8 ? 'text-red-600' : 'text-amber-600'}>
                    {formatRoas(camp.metrics.roas)}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-gray-700 whitespace-nowrap">
                  {camp.metrics.ctr !== null ? `${camp.metrics.ctr}%` : 'N/A'}
                </td>
                <td className="py-3 px-3 text-right text-gray-700 whitespace-nowrap">
                  {formatRupiah(camp.metrics.cpc)}
                </td>
                <td className="py-3 px-3 text-right text-gray-700 whitespace-nowrap">
                  {formatRupiah(camp.metrics.cpm)}
                </td>
                <td className="py-3 px-3 text-right text-gray-700 whitespace-nowrap">
                  {formatFrequency(camp.metrics.frequency)}
                </td>
                <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onAnalyzeCampaign(camp)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                    title="Analisis campaign dengan AI"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>AI</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List Transformation */}
      <div className="block md:hidden divide-y divide-gray-100 p-3 space-y-3">
        {filteredCampaigns.map((camp) => (
          <div
            key={camp.id}
            onClick={() => onSelectCampaign(camp)}
            className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="font-bold text-gray-900 text-xs">{camp.name}</h4>
                <div className="text-[11px] text-gray-400">
                  {camp.adSets.length} Ad Sets &bull; Budget: {formatRupiah(camp.dailyBudget)}
                </div>
              </div>
              <StatusBadge status={camp.status} size="sm" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-2 my-1 border-y border-gray-100">
              <div>
                <span className="text-gray-400 text-[10px] block">Spend</span>
                <span className="font-semibold text-gray-900">{formatRupiah(camp.metrics.spend)}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">ROAS</span>
                <span className="font-bold text-green-600">{formatRoas(camp.metrics.roas)}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">Purchases</span>
                <span className="font-semibold text-gray-900">{camp.metrics.purchases} orders</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">CPA</span>
                <span className={`font-semibold ${camp.metrics.cpa > 45_000 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatRupiah(camp.metrics.cpa)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-400 text-[11px]">
                CTR: {camp.metrics.ctr}% &bull; Freq: {formatFrequency(camp.metrics.frequency)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyzeCampaign(camp);
                  }}
                  className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-[11px] flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>AI</span>
                </button>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
