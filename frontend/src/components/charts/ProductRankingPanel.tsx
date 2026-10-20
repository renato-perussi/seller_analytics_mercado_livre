import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Layers, Package, Tag } from 'lucide-react';
import type { ListingRankingItem, SkuRankingItem } from '../../types/dashboard';
import {
  formatCompactCurrencyBRL,
  formatCurrencyBRL,
  formatIntegerBR,
  formatPercentBR,
} from '../../utils/formatters';

interface ProductRankingPanelProps {
  skuRanking: SkuRankingItem[];
  listingRanking: ListingRankingItem[];
  selectedSku: string;
  selectedListingId: string;
  onSelectSku: (sku: string) => void;
  onSelectListingId: (listingId: string) => void;
  isDark: boolean;
}

type RankingMode = 'sku' | 'listing';

interface ChartRow {
  id: string;
  shortName: string;
  subtitle: string;
  listingId: string;
  flavorOrSkus: string;
  net_revenue: number;
  gross_revenue: number;
  units: number;
  orders: number;
  net_margin_pct: number;
  share_revenue_pct: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}

const ProductTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
      <p className="font-mono font-bold text-ml-blue dark:text-blue-400">
        {item.id}
      </p>
      <p className="mt-0.5 line-clamp-2 font-medium text-slate-800 dark:text-slate-200">
        {item.subtitle}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
        {item.flavorOrSkus} • Anúncio: {item.listingId}
      </p>

      <div className="mt-2 space-y-1 border-t border-slate-100 pt-1.5 dark:border-slate-800">
        <div className="flex justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Receita Líquida:
          </span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {formatCurrencyBRL(item.net_revenue)} ({formatPercentBR(item.share_revenue_pct)})
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Faturamento Bruto:
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrencyBRL(item.gross_revenue)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Margem Líquida:
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatPercentBR(item.net_margin_pct)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">
            Volume Vendido:
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatIntegerBR(item.units)} unid. ({formatIntegerBR(item.orders)} ped.)
          </span>
        </div>
      </div>
    </div>
  );
};

function formatSkuShortName(item: SkuRankingItem): string {
  const prefix = item.sku.split('-')[0] || item.sku;
  if (item.flavor && item.flavor !== 'Sem Sabor') {
    return `${prefix} • ${item.flavor}`;
  }
  return item.sku;
}

export const ProductRankingPanel: React.FC<ProductRankingPanelProps> = ({
  skuRanking,
  listingRanking,
  selectedSku,
  selectedListingId,
  onSelectSku,
  onSelectListingId,
  isDark,
}) => {
  const [mode, setMode] = useState<RankingMode>('sku');

  const axisColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? '#1E293B' : '#F1F5F9';

  const rows: ChartRow[] =
    mode === 'sku'
      ? skuRanking.map((item) => ({
          id: item.sku,
          shortName: formatSkuShortName(item),
          subtitle: item.title,
          listingId: item.listing_id,
          flavorOrSkus: `Sabor: ${item.flavor}`,
          net_revenue: item.net_revenue,
          gross_revenue: item.gross_revenue,
          units: item.units,
          orders: item.orders,
          net_margin_pct: item.net_margin_pct,
          share_revenue_pct: item.share_revenue_pct,
        }))
      : listingRanking.map((item) => ({
          id: item.listing_id,
          shortName: `${item.listing_id} (${item.sku_count} SKU${
            item.sku_count > 1 ? 's' : ''
          })`,
          subtitle: item.title,
          listingId: item.listing_id,
          flavorOrSkus: `${item.sku_count} variante(s): ${item.skus.join(', ')}`,
          net_revenue: item.net_revenue,
          gross_revenue: item.gross_revenue,
          units: item.units,
          orders: item.orders,
          net_margin_pct: item.net_margin_pct,
          share_revenue_pct: item.share_revenue_pct,
        }));

  const topChartRows = rows.slice(0, 8);

  const handleRowClick = (id: string) => {
    if (mode === 'sku') {
      onSelectSku(selectedSku === id ? 'all' : id);
    } else {
      onSelectListingId(selectedListingId === id ? 'all' : id);
    }
  };

  return (
    <article className="flex h-full w-full flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-surface-dark-card">
      <div className="flex flex-1 flex-col justify-between">
        {/* Header & Mode Toggle */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Package
                className="h-4 w-4 text-ml-blue shrink-0"
                aria-hidden="true"
              />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ranking de Produtos e Anúncios
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Clique em um item para filtrar o painel por SKU (sabor) ou código de anúncio MLB
            </p>
          </div>

          <div
            role="group"
            aria-label="Modo de agrupamento de produtos"
            className="inline-flex self-start rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
          >
            <button
              type="button"
              onClick={() => setMode('sku')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                mode === 'sku'
                  ? 'bg-ml-blue text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              Por SKU ({skuRanking.length})
            </button>
            <button
              type="button"
              onClick={() => setMode('listing')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                mode === 'listing'
                  ? 'bg-ml-blue text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              Por Anúncio MLB ({listingRanking.length})
            </button>
          </div>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topChartRows}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke={gridColor}
              />
              <XAxis
                type="number"
                tickFormatter={formatCompactCurrencyBRL}
                tick={{ fill: axisColor, fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                width={145}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ProductTooltip />} />
              <Bar
                dataKey="net_revenue"
                name="Receita Líquida"
                radius={[0, 4, 4, 0]}
                maxBarSize={22}
                className="cursor-pointer"
                onClick={(barData) => {
                  if (barData && barData.id) {
                    handleRowClick(String(barData.id));
                  }
                }}
              >
                {topChartRows.map((entry) => {
                  const isSelected =
                    (mode === 'sku' && selectedSku === entry.id) ||
                    (mode === 'listing' && selectedListingId === entry.id);
                  return (
                    <Cell
                      key={entry.id}
                      fill={isSelected ? '#10B981' : '#3483FA'}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive Ranking List */}
        <div className="mt-3 max-h-[215px] overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">
                  {mode === 'sku' ? 'SKU / Sabor & Anúncio' : 'Anúncio MLB / Título'}
                </th>
                <th className="px-2 py-2 text-right">Unid.</th>
                <th className="px-2 py-2 text-right">Bruto</th>
                <th className="px-2 py-2 text-right">Margem</th>
                <th className="px-3 py-2 text-right">Líquido (BRL)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {rows.map((row, idx) => {
                const isSelected =
                  (mode === 'sku' && selectedSku === row.id) ||
                  (mode === 'listing' && selectedListingId === row.id);

                return (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-ml-blue-light/80 dark:bg-ml-blue/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {row.id}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {mode === 'sku' ? row.flavorOrSkus : `${row.orders} ped.`}
                            </span>
                            {mode === 'sku' && (
                              <span className="font-mono text-[10px] text-slate-400">
                                {row.listingId}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px]">
                            {row.subtitle}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                      {formatIntegerBR(row.units)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrencyBRL(row.gross_revenue)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {formatPercentBR(row.net_margin_pct)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrencyBRL(row.net_revenue)}
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
