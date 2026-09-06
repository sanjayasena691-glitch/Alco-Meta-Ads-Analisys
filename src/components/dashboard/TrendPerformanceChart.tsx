import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { DailyTrendPoint } from '../../types';
import { formatRupiah, formatNumber, formatRoas, formatPercent } from '../../utils/formatters';

interface TrendPerformanceChartProps {
  data: DailyTrendPoint[];
}

type ChartMetricMode =
  | 'spend_revenue'
  | 'roas'
  | 'cpa'
  | 'ctr'
  | 'cpc'
  | 'cpm'
  | 'purchases'
  | 'frequency';

export const TrendPerformanceChart: React.FC<TrendPerformanceChartProps> = ({ data }) => {
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('spend_revenue');

  const metricButtons: { id: ChartMetricMode; label: string }[] = [
    { id: 'spend_revenue', label: 'Spend vs Revenue' },
    { id: 'roas', label: 'ROAS' },
    { id: 'cpa', label: 'CPA' },
    { id: 'purchases', label: 'Purchases' },
    { id: 'ctr', label: 'CTR' },
    { id: 'cpc', label: 'CPC' },
    { id: 'cpm', label: 'CPM' },
    { id: 'frequency', label: 'Frequency' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
      {/* Header & Metric Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
            Trend Performa Harian
          </h3>
          <p className="text-xs text-gray-500">
            Pola pergerakan efisiensi biaya dan omzet iklan Meta Ads
          </p>
        </div>

        {/* Scrollable button tabs for metrics */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {metricButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setMetricMode(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                metricMode === btn.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {metricMode === 'spend_revenue' ? (
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => formatRupiah(val, true)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const spendVal = payload.find((p) => p.dataKey === 'spend')?.value as number;
                    const revVal = payload.find((p) => p.dataKey === 'revenue')?.value as number;
                    return (
                      <div className="bg-gray-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1">
                        <div className="font-bold text-gray-300 pb-1 border-b border-gray-800">{label}</div>
                        <div className="text-indigo-300">Spend: {formatRupiah(spendVal)}</div>
                        <div className="text-emerald-400">Revenue: {formatRupiah(revVal)}</div>
                        <div className="text-amber-300 font-semibold pt-1 border-t border-gray-800">
                          ROAS: {spendVal > 0 ? (revVal / spendVal).toFixed(2) : 0}x
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
              <Bar dataKey="spend" name="Spend" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#10b981' }}
              />
            </ComposedChart>
          ) : (
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => {
                  if (metricMode === 'cpa' || metricMode === 'cpc' || metricMode === 'cpm') {
                    return formatRupiah(val, true);
                  }
                  if (metricMode === 'ctr') return `${val}%`;
                  if (metricMode === 'roas') return `${val}x`;
                  return `${val}`;
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const val = payload[0].value as number;
                    let display = `${val}`;
                    if (metricMode === 'cpa' || metricMode === 'cpc' || metricMode === 'cpm') {
                      display = formatRupiah(val);
                    } else if (metricMode === 'ctr') {
                      display = `${val}%`;
                    } else if (metricMode === 'roas') {
                      display = formatRoas(val);
                    }
                    return (
                      <div className="bg-gray-900 text-white p-2.5 rounded-lg shadow-xl text-xs">
                        <div className="font-semibold text-gray-400">{label}</div>
                        <div className="font-bold text-indigo-300 mt-1">
                          {payload[0].name}: {display}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey={metricMode}
                name={metricButtons.find((b) => b.id === metricMode)?.label || metricMode}
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#4f46e5' }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
