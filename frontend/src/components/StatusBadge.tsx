import React from 'react';
import { CheckCircle2, Scale, XCircle, HelpCircle } from 'lucide-react';
import { getStatusDisplayMeta } from '../utils/formatters';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showFullLabel?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showFullLabel = false,
}) => {
  const meta = getStatusDisplayMeta(status);
  const label = showFullLabel ? meta.fullLabel : meta.shortLabel;

  const toneClasses: Record<typeof meta.tone, string> = {
    emerald:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70',
    amber:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70',
    red: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/70',
    slate:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-xs gap-1.5'
      : 'px-3 py-1 text-xs sm:text-sm gap-1.5';

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0';

  const renderIcon = () => {
    switch (meta.tone) {
      case 'emerald':
        return <CheckCircle2 className={iconSize} aria-hidden="true" />;
      case 'amber':
        return <Scale className={iconSize} aria-hidden="true" />;
      case 'red':
        return <XCircle className={iconSize} aria-hidden="true" />;
      default:
        return <HelpCircle className={iconSize} aria-hidden="true" />;
    }
  };

  return (
    <span
      title={meta.fullLabel}
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${toneClasses[meta.tone]}`}
    >
      {renderIcon()}
      <span className="truncate">{label}</span>
    </span>
  );
};
