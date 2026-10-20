import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Megaphone, ShieldCheck, Sparkles } from 'lucide-react';
import type {
  AdsBreakdownItem,
  AdSaleFilterValue,
  StatusBreakdownItem,
} from '../../types/dashboard';
import {
  formatCompactCurrencyBRL,
  formatCurrencyBRL,
  formatIntegerBR,
  formatPercentBR,
} from '../../utils/formatters';
import { StatusBadge } from '../StatusBadge';

interface AdsAndStatusPanelProps {
  adsBreakdown: AdsBreakdownItem[];
  statusBreakdown: StatusBreakdownItem[];
  selectedAdSale: AdSaleFilterValue;
  selectedStatus: string;
  onSelectAdSale: (adSale: AdSaleFilterValue) => void;
  onSelectStatus: (status: string) => void;
  isDark: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AdsBreakdownItem }>;
}

const AdsTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="min-w-[230px] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
      <p className="font-bold text-slate-900 dark:text-white">{item.segment}</p>
      <div className="mt-2 space-y-1 border-t border-slate-100 pt-1.5 dark:border-slate-800">
        <div className="flex justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Faturamento Bruto:
          </span>
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrencyBRL(item.gross_revenue)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Receita Líquida:
          </span>
          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
            {formatCurrencyBRL(item.net_revenue)} ({formatPercentBR(item.share_revenue_pct)})
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Ticket Médio Líquido:
          </span>
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrencyBRL(item.average_ticket)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Margem Líquida:
          </span>
          <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
            {formatPercentBR(item.net_margin_pct)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Pedidos Realizados:
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatIntegerBR(item.orders)} ({formatPercentBR(item.share_orders_pct)})
          </span>
        </div>
      </div>
    </div>
  );
};

export const AdsAndStatusPanel: React.FC<AdsAndStatusPanelProps> = ({
  adsBreakdown,
  statusBreakdown,
  selectedAdSale,
  selectedStatus,
  onSelectAdSale,
  onSelectStatus,
  isDark,
}) => {
  const axisColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? '#1E293B' : '#F1F5F9';

  const handleSegmentClick = (isAdSale: boolean) => {
    const targetVal: AdSaleFilterValue = isAdSale ? 'true' : 'false';
    onSelectAdSale(selectedAdSale === targetVal ? 'all' : targetVal);
  };

  const handleStatusClick = (statusVal: string) => {
    onSelectStatus(selectedStatus === statusVal ? 'all' : statusVal);
  };

  return (
    <section
      aria-label="Eficiência de publicidade e distribuição por status"
      className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-12"
    >
      {/* Left 7 cols: Eficiência de Publicidade (Mercado Ads vs. Orgânico) */}
      <article className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-surface-dark-card">
        <div>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Megaphone
                className="h-4 w-4 text-ml-blue shrink-0"
                aria-hidden="true"
              />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Eficiência de Publicidade (Mercado Ads vs. Orgânico)
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Comparação de participação na receita, ticket médio e margem líquida entre canais (clique para filtrar)
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Comparison Cards */}
            <div className="md:col-span-6 space-y-3">
              {adsBreakdown.map((seg) => {
                const filterVal: AdSaleFilterValue = seg.is_ad_sale
                  ? 'true'
                  : 'false';
                const isSelected = selectedAdSale === filterVal;

                return (
                  <div
                    key={seg.segment}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSegmentClick(seg.is_ad_sale)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSegmentClick(seg.is_ad_sale);
                      }
                    }}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? 'border-ml-blue bg-ml-blue-light/60 ring-2 ring-ml-blue/25 dark:border-ml-blue dark:bg-ml-blue/15'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        <Sparkles
                          className={`h-3.5 w-3.5 ${
                            seg.is_ad_sale ? 'text-ml-blue' : 'text-emerald-600'
                          }`}
                          aria-hidden="true"
                        />
                        {seg.segment}
                      </span>
                      <span className="rounded-md bg-ml-yellow px-2 py-0.5 font-mono text-[11px] font-bold text-slate-900">
                        {formatPercentBR(seg.share_revenue_pct)} da receita
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Receita Líquida
                        </span>
                        <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrencyBRL(seg.net_revenue)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Pedidos Realizados
                        </span>
                        <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {formatIntegerBR(seg.orders)}{' '}
                          <span className="text-[11px] font-normal text-slate-500">
                            ({formatPercentBR(seg.share_orders_pct)})
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Ticket Médio Líq.
                        </span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrencyBRL(seg.average_ticket)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Margem Líquida
                        </span>
                        <p className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatPercentBR(seg.net_margin_pct)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ads vs Organic BarChart */}
            <div className="md:col-span-6 h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={adsBreakdown}
                  margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={gridColor}
                  />
                  <XAxis
                    dataKey="segment"
                    tick={{ fill: axisColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    tickFormatter={formatCompactCurrencyBRL}
                    tick={{ fill: axisColor, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={66}
                  />
                  <Tooltip content={<AdsTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="gross_revenue"
                    name="Faturamento Bruto"
                    fill="#3483FA"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="net_revenue"
                    name="Receita Líquida"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </article>

      {/* Right 5 cols: Status dos Pedidos & Reconhecimento de Receita */}
      <article className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-surface-dark-card">
        <div>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck
                className="h-4 w-4 text-ml-blue shrink-0"
                aria-hidden="true"
              />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Status dos Pedidos e Reconhecimento de Receita
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Distribuição operacional por status (clique em um status para filtrar)
            </p>
          </div>

          <div className="space-y-3">
            {statusBreakdown.map((item) => {
              const isSelected = selectedStatus === item.status;

              return (
                <div
                  key={item.status}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleStatusClick(item.status)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStatusClick(item.status);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-ml-blue bg-ml-blue-light/60 ring-2 ring-ml-blue/25 dark:border-ml-blue dark:bg-ml-blue/15'
                      : 'border-slate-200 bg-slate-50/40 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={item.status} size="sm" showFullLabel />
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {formatIntegerBR(item.orders)} ped. ({formatPercentBR(item.share_orders_pct)})
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${
                        item.status.toLowerCase().includes('cancelada')
                          ? 'bg-red-500'
                          : item.status.toLowerCase().includes('mediação')
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, item.share_orders_pct)}%` }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>
                      Unidades: <strong className="text-slate-800 dark:text-slate-200">{formatIntegerBR(item.units)}</strong>
                    </span>
                    <span>
                      Rec. Produtos: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatCurrencyBRL(item.gross_product_revenue)}</strong>
                    </span>
                    <span>
                      Líquido: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{formatCurrencyBRL(item.net_revenue)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </article>
    </section>
  );
};
