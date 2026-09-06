import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Target, 
  MousePointerClick, 
  Eye, 
  Repeat,
  Coins
} from 'lucide-react';
import { PeriodMetricsSummary, TimePeriod } from '../../types';
import { formatRupiah, formatPercent, formatRoas, formatFrequency, formatNumber } from '../../utils/formatters';
import { JargonTooltip } from '../common/JargonTooltip';

interface MetricCardsGridProps {
  summary: PeriodMetricsSummary;
  currentPeriod: TimePeriod;
}

export const MetricCardsGrid: React.FC<MetricCardsGridProps> = ({ summary, currentPeriod }) => {
  const getPeriodComparisonText = () => {
    switch (currentPeriod) {
      case 'today':
        return 'vs kemarin jam yang sama';
      case 'yesterday':
        return 'vs 2 hari lalu';
      case 'last_3_days':
        return 'vs 3 hari sebelumnya';
      case 'last_14_days':
        return 'vs 14 hari sebelumnya';
      case 'last_30_days':
        return 'vs 30 hari sebelumnya';
      case 'last_7_days':
      default:
        return 'vs previous 7 days';
    }
  };

  const compLabel = getPeriodComparisonText();

  const cards = [
    {
      title: 'Spend',
      value: formatRupiah(summary.spend.current),
      percent: summary.spend.percentChange,
      isPositive: summary.spend.isPositiveChange,
      icon: DollarSign,
      termKey: '',
      color: 'sky',
    },
    {
      title: 'Revenue / Value',
      value: formatRupiah(summary.revenue.current),
      percent: summary.revenue.percentChange,
      isPositive: summary.revenue.isPositiveChange,
      icon: Coins,
      termKey: '',
      color: 'emerald',
    },
    {
      title: 'Purchases',
      value: summary.purchases.current !== null ? `${summary.purchases.current} order` : 'N/A',
      percent: summary.purchases.percentChange,
      isPositive: summary.purchases.isPositiveChange,
      icon: ShoppingCart,
      termKey: '',
      color: 'indigo',
    },
    {
      title: 'ROAS',
      value: formatRoas(summary.roas.current),
      percent: summary.roas.percentChange,
      isPositive: summary.roas.isPositiveChange,
      icon: TrendingUp,
      termKey: 'ROAS',
      color: 'emerald',
      highlight: true,
    },
    {
      title: 'CPA / Cost per Purchase',
      value: formatRupiah(summary.cpa.current),
      percent: summary.cpa.percentChange,
      isPositive: summary.cpa.isPositiveChange,
      icon: Target,
      termKey: 'CPA',
      color: 'amber',
      highlight: true,
    },
    {
      title: 'CTR (Click-Through Rate)',
      value: summary.ctr.current !== null ? `${summary.ctr.current}%` : 'N/A',
      percent: summary.ctr.percentChange,
      isPositive: summary.ctr.isPositiveChange,
      icon: MousePointerClick,
      termKey: 'CTR',
      color: 'violet',
    },
    {
      title: 'CPC (Cost per Click)',
      value: formatRupiah(summary.cpc.current),
      percent: summary.cpc.percentChange,
      isPositive: summary.cpc.isPositiveChange,
      icon: MousePointerClick,
      termKey: 'CPC',
      color: 'slate',
    },
    {
      title: 'CPM (Cost per 1k Imp)',
      value: formatRupiah(summary.cpm.current),
      percent: summary.cpm.percentChange,
      isPositive: summary.cpm.isPositiveChange,
      icon: Eye,
      termKey: 'CPM',
      color: 'slate',
    },
    {
      title: 'Frequency',
      value: formatFrequency(summary.frequency.current),
      percent: summary.frequency.percentChange,
      isPositive: summary.frequency.isPositiveChange,
      icon: Repeat,
      termKey: 'Frequency',
      color: 'slate',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const hasPercent = card.percent !== null && card.percent !== undefined;
        const isUp = hasPercent && card.percent! >= 0;
        
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl bg-white border transition-all hover:border-gray-300 shadow-xs ${
              card.highlight
                ? 'border-indigo-200 ring-1 ring-indigo-50'
                : 'border-gray-200'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {card.title}
                </span>
                {card.termKey && <JargonTooltip termKey={card.termKey} />}
              </div>
              <div className="p-1 rounded-md bg-gray-50 text-gray-400">
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Current Value */}
            <div className="text-xl font-bold text-gray-900 tracking-tight mb-2">
              {card.value}
            </div>

            {/* Comparison Badge & Label */}
            <div className="flex items-center gap-1 text-xs">
              {hasPercent ? (
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
                    card.isPositive
                      ? 'text-green-600 bg-green-50 px-1.5 py-0.2 rounded'
                      : 'text-red-600 bg-red-50 px-1.5 py-0.2 rounded'
                  }`}
                >
                  {isUp ? (
                    <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                  ) : (
                    <TrendingDown className="w-3 h-3 stroke-[2.5]" />
                  )}
                  <span>{formatPercent(Math.abs(card.percent!))}</span>
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.2 rounded">
                  N/A
                </span>
              )}
              <span className="text-[10px] text-gray-400 truncate">{compLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
