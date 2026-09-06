import React from 'react';
import { EntityStatus, HealthStatus } from '../../types';

interface StatusBadgeProps {
  status: EntityStatus | HealthStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true,
}) => {
  let bg = 'bg-gray-100 text-gray-700 border-gray-200';
  let dot = 'bg-gray-400';
  let label = 'Not Enough Data';
  let icon = '⚪';

  switch (status) {
    case 'HEALTHY':
      bg = 'bg-green-100 text-green-700 border-green-200';
      dot = 'bg-green-500';
      label = 'Healthy';
      icon = '🟢';
      break;
    case 'MONITOR':
    case 'NEED_ATTENTION':
      bg = 'bg-amber-100 text-amber-700 border-amber-200';
      dot = 'bg-amber-500';
      label = status === 'NEED_ATTENTION' ? 'Need Attention' : 'Monitor';
      icon = '🟡';
      break;
    case 'PROBLEM':
    case 'CRITICAL':
      bg = 'bg-red-100 text-red-700 border-red-200';
      dot = 'bg-red-500';
      label = status === 'CRITICAL' ? 'Critical' : 'Problem';
      icon = '🔴';
      break;
    case 'NOT_ENOUGH_DATA':
    default:
      bg = 'bg-gray-100 text-gray-700 border-gray-200';
      dot = 'bg-gray-400';
      label = 'Not Enough Data';
      icon = '⚪';
      break;
  }

  const sizeClasses = {
    sm: 'text-[10px] font-bold px-1.5 py-0.2',
    md: 'text-[10px] font-bold px-2 py-0.5',
    lg: 'text-xs font-bold px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border ${bg} ${sizeClasses[size]} transition-all`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {showLabel && <span>{label}</span>}
    </span>
  );
};
