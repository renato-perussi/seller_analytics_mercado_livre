import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FilterX,
  RefreshCw,
  X,
} from 'lucide-react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div
      className="space-y-6 animate-pulse"
      role="status"
      aria-label="Carregando dados analíticos do painel"
    >
      {/* 5 KPI Skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="h-36 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-surface-dark-card"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-8 w-36 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
            <div className="h-3.5 w-44 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>

      {/* Main Charts Skeletons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 h-96 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-surface-dark-card">
          <div className="h-5 w-52 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
          <div className="h-3.5 w-72 rounded bg-slate-100 dark:bg-slate-800 mb-6" />
          <div className="h-64 w-full rounded-lg bg-slate-100 dark:bg-slate-800/70" />
        </div>
        <div className="lg:col-span-5 h-96 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-surface-dark-card">
          <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
          <div className="h-3.5 w-64 rounded bg-slate-100 dark:bg-slate-800 mb-6" />
          <div className="h-64 w-full rounded-lg bg-slate-100 dark:bg-slate-800/70" />
        </div>
      </div>

      {/* Secondary Charts Skeletons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6 h-80 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-surface-dark-card" />
        <div className="lg:col-span-6 h-80 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-surface-dark-card" />
      </div>
    </div>
  );
};

interface EmptyFilterStateProps {
  onResetFilters: () => void;
}

export const EmptyFilterState: React.FC<EmptyFilterStateProps> = ({
  onResetFilters,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-card dark:border-slate-800 dark:bg-surface-dark-card">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
        <FilterX className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Nenhum pedido encontrado para os filtros selecionados
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600 dark:text-slate-400">
        Não há registros que combinem com a combinação atual de período, UF, SKU,
        status ou termo de busca. Limpe os filtros para visualizar novamente todo
        o histórico de vendas.
      </p>
      <div className="mt-5">
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-2 rounded-lg bg-ml-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ml-blue-hover focus:outline-none focus:ring-2 focus:ring-ml-blue focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <FilterX className="h-4 w-4" aria-hidden="true" />
          Limpar Filtros
        </button>
      </div>
    </div>
  );
};

interface DashboardErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const DashboardErrorState: React.FC<DashboardErrorStateProps> = ({
  message,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50/80 p-8 text-center dark:border-red-900/60 dark:bg-red-950/30"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-red-900 dark:text-red-200">
        Não foi possível carregar os dados do painel
      </h3>
      <p className="mx-auto mt-1 max-w-lg text-sm text-red-700 dark:text-red-300">
        {message}
      </p>
      <div className="mt-5">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tentar Novamente
        </button>
      </div>
    </div>
  );
};

export interface FeedbackNotice {
  type: 'success' | 'error';
  message: string;
}

interface FeedbackBannerProps {
  notice: FeedbackNotice | null;
  onDismiss: () => void;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({
  notice,
  onDismiss,
}) => {
  if (!notice) return null;

  const isSuccess = notice.type === 'success';

  return (
    <div
      role="status"
      className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-200'
          : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800/70 dark:bg-red-950/60 dark:text-red-200'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {isSuccess ? (
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
        )}
        <span className="font-medium">{notice.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar notificação"
        className="rounded-lg p-1 opacity-75 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
