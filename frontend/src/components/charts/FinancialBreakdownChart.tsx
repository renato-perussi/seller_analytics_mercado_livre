import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Equal, Scale } from 'lucide-react';
import type { FinancialBreakdownStep } from '../../types/dashboard';
import {
  formatCompactCurrencyBRL,
  formatCurrencyBRL,
  formatPercentBR,
} from '../../utils/formatters';

interface FinancialBreakdownChartProps {
  steps: FinancialBreakdownStep[];
  isDark: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: FinancialBreakdownStep & { shortLabel: string } }>;
}

const BreakdownTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const step = payload[0].payload;

  return (
    <div className="min-w-[230px] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
      <p className="font-bold text-slate-900 dark:text-white">{step.label}</p>
      <div className="mt-2 space-y-1 border-t border-slate-100 pt-1.5 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">Valor:</span>
          <span
            className={`font-mono font-bold ${
              step.type === 'debit'
                ? 'text-red-600 dark:text-red-400'
                : step.type === 'total'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-ml-blue dark:text-blue-400'
            }`}
          >
            {step.type === 'credit' && step.value > 0 ? '+' : ''}
            {formatCurrencyBRL(step.value)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Saldo Acumulado:
          </span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
            {formatCurrencyBRL(step.running_total)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Peso s/ Entrada Bruta:
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {formatPercentBR(step.share_of_gross_pct)}
          </span>
        </div>
      </div>
    </div>
  );
};

function getStepBarColor(step: FinancialBreakdownStep): string {
  if (step.type === 'total') return '#10B981';
  if (step.type === 'credit') return '#3483FA';
  if (step.key === 'cancellations') return '#EF4444';
  return '#F59E0B';
}

function getShortStepName(key: string, label: string): string {
  switch (key) {
    case 'gross_product_revenue':
      return 'Rec. Produtos';
    case 'shipping_revenue':
      return 'Rec. Envio';
    case 'sale_fees':
      return 'Tarifa Venda';
    case 'shipping_fees':
      return 'Tarifa Envio';
    case 'cancellations':
      return 'Cancelamentos';
    case 'net_revenue':
      return 'Líquido (Total)';
    default:
      return label;
  }
}

export const FinancialBreakdownChart: React.FC<FinancialBreakdownChartProps> = ({
  steps,
  isDark,
}) => {
  const axisColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? '#1E293B' : '#F1F5F9';

  const chartData = steps.map((step) => ({
    ...step,
    shortLabel: getShortStepName(step.key, step.label),
  }));

  const finalStep = steps.find((s) => s.key === 'net_revenue');

  return (
    <article className="flex h-full w-full flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-surface-dark-card">
      <div className="flex flex-1 flex-col justify-between">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Scale
                className="h-4 w-4 text-ml-blue shrink-0"
                aria-hidden="true"
              />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Decomposição Financeira (Bruto → Líquido)
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Conciliação exata ao centavo das entradas, tarifas ML e cancelamentos
            </p>
          </div>

          {finalStep && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Conciliado: {formatCurrencyBRL(finalStep.value)}
            </span>
          )}
        </div>

        {/* Bar Chart */}
        <div className="h-[175px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 2 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={gridColor}
              />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: axisColor, fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                interval={0}
              />
              <YAxis
                tickFormatter={formatCompactCurrencyBRL}
                tick={{ fill: axisColor, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={68}
              />
              <ReferenceLine y={0} stroke={axisColor} strokeOpacity={0.5} />
              <Tooltip content={<BreakdownTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={38}>
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={getStepBarColor(entry)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Reconciliation Summary Table */}
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-2.5 py-1.5">Componente Financeiro</th>
                <th className="px-2 py-1.5 text-right">% Entrada</th>
                <th className="px-2.5 py-1.5 text-right">Valor (BRL)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {steps.map((step) => {
                const isTotal = step.type === 'total';
                const isDebit = step.type === 'debit';

                return (
                  <tr
                    key={step.key}
                    className={
                      isTotal
                        ? 'bg-emerald-50/70 font-bold text-slate-900 dark:bg-emerald-950/30 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }
                  >
                    <td className="px-2.5 py-1.5 flex items-center gap-1.5">
                      {isTotal ? (
                        <Equal
                          className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                          aria-hidden="true"
                        />
                      ) : isDebit ? (
                        <ArrowDownRight
                          className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowUpRight
                          className="h-3.5 w-3.5 text-ml-blue shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{step.label}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {formatPercentBR(step.share_of_gross_pct)}
                    </td>
                    <td
                      className={`px-2.5 py-1.5 text-right font-mono ${
                        isTotal
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : isDebit
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {step.type === 'credit' && step.value > 0 ? '+' : ''}
                      {formatCurrencyBRL(step.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
};
