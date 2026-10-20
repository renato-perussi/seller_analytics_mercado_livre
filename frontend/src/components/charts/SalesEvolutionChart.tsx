import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { TimeGranularity, TimeSeriesPoint } from '../../types/dashboard';
import {
  formatCompactCurrencyBRL,
  formatCurrencyBRL,
  formatIntegerBR,
  formatPercentBR,
} from '../../utils/formatters';

interface SalesEvolutionChartProps {
  data: TimeSeriesPoint[];
  granularity: TimeGranularity;
  onChangeGranularity: (granularity: TimeGranularity) => void;
  isDark: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TimeSeriesPoint }>;
  label?: string;
}

const SalesEvolutionTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const marginPct =
    point.gross_revenue > 0
      ? (point.net_revenue / point.gross_revenue) * 100
      : 0;

  return (
    <div className="min-w-[240px] rounded-xl border border-slate-200 bg-white/95 p-3.5 text-xs shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800">
        <span className="font-bold text-slate-900 dark:text-white">
          Período: {point.label}
        </span>
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
          Margem: {formatPercentBR(marginPct)}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-ml-blue" />
            Faturamento Bruto:
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrencyBRL(point.gross_revenue)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Receita Líquida:
          </span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {formatCurrencyBRL(point.net_revenue)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Tarifas Venda + Envio:
          </span>
          <span className="font-medium text-amber-700 dark:text-amber-400">
            -{formatCurrencyBRL(point.sale_fees + point.shipping_fees)}
          </span>
        </div>

        <div className="my-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-400">
              Pedidos Realizados:
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatIntegerBR(point.realized_orders)} ({formatIntegerBR(point.units)} unid.)
            </span>
          </div>
          {point.canceled_orders > 0 && (
            <div className="mt-0.5 flex items-center justify-between gap-4">
              <span className="text-red-600 dark:text-red-400">
                Pedidos Cancelados:
              </span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatIntegerBR(point.canceled_orders)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const SalesEvolutionChart: React.FC<SalesEvolutionChartProps> = ({
  data,
  granularity,
  onChangeGranularity,
  isDark,
}) => {
  const granularityOptions: Array<{ value: TimeGranularity; label: string }> = [
    { value: 'month', label: 'Mensal' },
    { value: 'week', label: 'Semanal' },
    { value: 'day', label: 'Diário' },
  ];

  const axisColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? '#1E293B' : '#F1F5F9';

  const peakPeriod =
    data.length > 0
      ? data.reduce((best, curr) =>
          curr.net_revenue > best.net_revenue ? curr : best,
        )
      : null;

  const avgNetPerPeriod =
    data.length > 0
      ? data.reduce((acc, item) => acc + item.net_revenue, 0) / data.length
      : 0;

  const totalRealizedOrders = data.reduce(
    (acc, item) => acc + item.realized_orders,
    0,
  );
  const totalUnits = data.reduce((acc, item) => acc + item.units, 0);

  return (
    <article className="flex h-full w-full flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-surface-dark-card">
      <div className="flex flex-1 flex-col">
        {/* Card Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp
                className="h-4 w-4 text-ml-blue shrink-0"
                aria-hidden="true"
              />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Evolução de Vendas e Pedidos Realizados
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Comparativo temporal entre Faturamento Bruto, Receita Líquida (Total BRL) e volume de pedidos
            </p>
          </div>

          {/* Granularity Toggle */}
          <div
            role="group"
            aria-label="Granularidade temporal do gráfico"
            className="inline-flex self-start rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
          >
            {granularityOptions.map((opt) => {
              const isActive = granularity === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChangeGranularity(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-ml-blue text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Body */}
        <div className="h-[335px] min-h-[335px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={gridColor}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
              />
              <YAxis
                yAxisId="revenue"
                tickFormatter={formatCompactCurrencyBRL}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={74}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                tickFormatter={(v) => `${v} ped.`}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<SalesEvolutionTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
              <Bar
                yAxisId="revenue"
                dataKey="gross_revenue"
                name="Faturamento Bruto"
                fill="#3483FA"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
              <Bar
                yAxisId="revenue"
                dataKey="net_revenue"
                name="Receita Líquida (Total BRL)"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="realized_orders"
                name="Pedidos Realizados"
                stroke="#F59E0B"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#F59E0B', strokeWidth: 1.5, stroke: '#FFF' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Footer Strip for Visual & Analytical Balance */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex flex-col justify-between rounded-md bg-white px-3 py-2 shadow-2xs dark:bg-slate-900/60">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Pico de Receita Líquida
            </span>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                {peakPeriod ? peakPeriod.label : '—'}
              </span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {peakPeriod ? formatCurrencyBRL(peakPeriod.net_revenue) : 'R$ 0,00'}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-md bg-white px-3 py-2 shadow-2xs dark:bg-slate-900/60">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Média Líquida / Período
            </span>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {formatIntegerBR(data.length)} período(s)
              </span>
              <span className="font-mono font-bold text-ml-blue dark:text-blue-400">
                {formatCurrencyBRL(avgNetPerPeriod)}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-md bg-white px-3 py-2 shadow-2xs dark:bg-slate-900/60">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Volume Acumulado
            </span>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatIntegerBR(totalRealizedOrders)} pedidos
              </span>
              <span className="font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                {formatIntegerBR(totalUnits)} unid.
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
