import React from 'react';
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Percent,
  Receipt,
  Scale,
  ShoppingCart,
  TrendingUp,
  Truck,
  XCircle,
} from 'lucide-react';
import type { DashboardKPIs } from '../types/dashboard';
import {
  formatCurrencyBRL,
  formatDecimalBR,
  formatIntegerBR,
  formatPercentBR,
} from '../utils/formatters';

interface KpiSectionProps {
  kpis: DashboardKPIs;
}

export const KpiSection: React.FC<KpiSectionProps> = ({ kpis }) => {
  return (
    <section
      aria-label="Resumo executivo de indicadores chave"
      className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      {/* KPI 1: Receita Líquida Realizada (Primary KPI) */}
      <article className="relative flex flex-col justify-between overflow-hidden rounded-xl border-2 border-ml-blue/35 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover dark:border-ml-blue/50 dark:bg-surface-dark-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1 rounded-md bg-ml-yellow px-2 py-0.5 text-[10px] font-bold text-slate-900">
              KPI Principal • Total (BRL)
            </span>
            <h2 className="mt-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Receita Líquida Realizada
            </h2>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <DollarSign className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="my-3">
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrencyBRL(kpis.net_revenue)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              Margem Líquida: {formatPercentBR(kpis.net_margin_pct)}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-2.5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span>Sobre Faturamento Bruto:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatCurrencyBRL(kpis.gross_revenue)}
            </span>
          </div>
        </div>
      </article>

      {/* KPI 2: Faturamento Bruto Realizado */}
      <article className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-800 dark:bg-surface-dark-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Vendas Válidas (Sem Cancelados)
            </span>
            <h2 className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Faturamento Bruto Realizado
            </h2>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-ml-blue dark:bg-blue-950/60 dark:text-blue-400">
            <Receipt className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="my-3">
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {formatCurrencyBRL(kpis.gross_revenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Receita frete comprador:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              +{formatCurrencyBRL(kpis.shipping_revenue)}
            </span>
          </p>
        </div>

        <div className="space-y-1 border-t border-slate-100 pt-2.5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span>Ticket Médio Bruto:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatCurrencyBRL(kpis.gross_average_ticket)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ticket Médio Líquido:</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {formatCurrencyBRL(kpis.average_ticket)}
            </span>
          </div>
        </div>
      </article>

      {/* KPI 3: Pedidos Realizados & Unidades */}
      <article className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-800 dark:bg-surface-dark-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Conversão Operacional
            </span>
            <h2 className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Pedidos Realizados
            </h2>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-ml-navy dark:bg-indigo-950/60 dark:text-indigo-300">
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatIntegerBR(kpis.realized_orders)}
            </p>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              / {formatIntegerBR(kpis.total_orders)} pedidos
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            <CheckCircle2
              className="mr-1 inline h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            {formatIntegerBR(kpis.units_sold)} unidades entregues
          </p>
        </div>

        <div className="space-y-1 border-t border-slate-100 pt-2.5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1">
              <XCircle
                className="h-3 w-3 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
              Cancelamentos ({formatIntegerBR(kpis.canceled_orders)}):
            </span>
            <span className="font-semibold text-red-700 dark:text-red-400">
              {formatPercentBR(kpis.cancellation_rate_pct)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1">
              <Scale
                className="h-3 w-3 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              Mediações favoráveis:
            </span>
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              {formatIntegerBR(kpis.mediation_orders)}
            </span>
          </div>
        </div>
      </article>

      {/* KPI 4: Tarifas ML & Custo de Frete */}
      <article className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-800 dark:bg-surface-dark-card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Deduções & Comissões ML
            </span>
            <h2 className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Tarifas ML & Custo de Frete
            </h2>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <Percent className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="my-3">
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            -{formatCurrencyBRL(kpis.total_fees)}
          </p>
          <div className="mt-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-300">
              Peso sobre entrada: {formatPercentBR(kpis.fee_burden_pct)}
            </span>
          </div>
        </div>

        <div className="space-y-1 border-t border-slate-100 pt-2.5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span>Tarifa de venda ML:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              -{formatCurrencyBRL(kpis.sale_fees)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Frete líquido vendedor:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              -{formatCurrencyBRL(kpis.net_shipping_cost)}
            </span>
          </div>
        </div>
      </article>

      {/* KPI 5: Prazo Médio de Entrega */}
      <article className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-800 dark:bg-surface-dark-card sm:col-span-2 xl:col-span-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              SLA Logístico (Pedidos Válidos)
            </span>
            <h2 className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Prazo Médio de Entrega
            </h2>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatDecimalBR(kpis.avg_delivery_days, 1)}
            </p>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              dias corridos
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="mr-1 inline h-3 w-3" aria-hidden="true" />
            Exclui pedidos cancelados (delta 0)
          </p>
        </div>

        <div className="space-y-1 border-t border-slate-100 pt-2.5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span>Postagem (Despacho):</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatDecimalBR(kpis.avg_dispatch_days, 1)} dias
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Trânsito (Correios):</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatDecimalBR(kpis.avg_transit_days, 1)} dias
            </span>
          </div>
        </div>
      </article>
    </section>
  );
};
