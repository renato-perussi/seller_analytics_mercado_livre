import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Megaphone,
} from 'lucide-react';
import type {
  OrderRecord,
  OrdersResponse,
  SortDirection,
} from '../types/dashboard';
import {
  formatCurrencyBRL,
  formatDaysBR,
  formatIntegerBR,
} from '../utils/formatters';
import { StatusBadge } from './StatusBadge';

interface OrdersTableProps {
  ordersData: OrdersResponse | null;
  isLoading: boolean;
  sortBy: string;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
  onSortChange: (column: string) => void;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  onSelectOrder: (order: OrderRecord) => void;
}

export const OrdersTable: React.FC<OrdersTableProps> = ({
  ordersData,
  isLoading,
  sortBy,
  sortDir,
  page,
  pageSize,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onSelectOrder,
}) => {
  const items = ordersData?.items ?? [];
  const total = ordersData?.total ?? 0;
  const totalPages = ordersData?.total_pages ?? 1;

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(total, page * pageSize);

  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return (
        <ArrowUpDown
          className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100"
          aria-hidden="true"
        />
      );
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-ml-blue" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3 w-3 text-ml-blue" aria-hidden="true" />
    );
  };

  const sortableHeaderButton = (
    label: string,
    columnKey: string,
    align: 'left' | 'right' | 'center' = 'left',
  ) => (
    <button
      type="button"
      onClick={() => onSortChange(columnKey)}
      className={`group inline-flex items-center gap-1 font-semibold text-slate-600 transition-colors hover:text-ml-blue dark:text-slate-300 dark:hover:text-blue-400 ${
        align === 'right'
          ? 'ml-auto justify-end'
          : align === 'center'
            ? 'mx-auto justify-center'
            : ''
      }`}
    >
      <span>{label}</span>
      {renderSortIcon(columnKey)}
    </button>
  );

  return (
    <section
      aria-label="Tabela operacional de pedidos"
      className="rounded-xl border border-slate-200/90 bg-white shadow-card dark:border-slate-800 dark:bg-surface-dark-card"
    >
      {/* Table Header Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet
              className="h-4 w-4 text-ml-blue shrink-0"
              aria-hidden="true"
            />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Detalhamento Operacional de Pedidos
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {formatIntegerBR(total)} registros
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Clique em qualquer linha para abrir a auditoria completa de tarifas, envio e conciliação financeira do pedido
          </p>
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2 text-xs">
          <label
            htmlFor="table-page-size"
            className="font-medium text-slate-600 dark:text-slate-400"
          >
            Exibir por página:
          </label>
          <select
            id="table-page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-ml-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] dark:border-slate-800 dark:bg-slate-800/70">
            <tr>
              <th className="whitespace-nowrap px-3.5 py-2.5">
                {sortableHeaderButton('N.º de venda', 'order_id')}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5">
                {sortableHeaderButton('Data', 'sale_date')}
              </th>
              <th className="px-3 py-2.5">
                {sortableHeaderButton('Produto / SKU', 'sku')}
              </th>
              <th className="whitespace-nowrap px-2.5 py-2.5 text-center">
                {sortableHeaderButton('UF', 'state', 'center')}
              </th>
              <th className="whitespace-nowrap px-2.5 py-2.5 text-right">
                {sortableHeaderButton('Unid.', 'units', 'right')}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">
                {sortableHeaderButton('Bruto', 'product_revenue', 'right')}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">
                {sortableHeaderButton('Tarifas', 'sale_fee', 'right')}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">
                {sortableHeaderButton('Frete Líq.', 'shipping_fee', 'right')}
              </th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">
                {sortableHeaderButton('Líquido (Total BRL)', 'net_revenue', 'right')}
              </th>
              <th className="whitespace-nowrap px-2.5 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">
                Ads
              </th>
              <th className="whitespace-nowrap px-2.5 py-2.5 text-right">
                {sortableHeaderButton('Prazo', 'delivery_days', 'right')}
              </th>
              <th className="whitespace-nowrap px-3.5 py-2.5">
                {sortableHeaderButton('Status', 'status')}
              </th>
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-slate-100 dark:divide-slate-800/80 ${
              isLoading ? 'opacity-60' : ''
            }`}
          >
            {items.map((order) => {
              const netShipping = Number(
                (order.shipping_revenue + order.shipping_fee_deduction).toFixed(2),
              );

              return (
                <tr
                  key={order.order_id}
                  onClick={() => onSelectOrder(order)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectOrder(order);
                    }
                  }}
                  className="group cursor-pointer transition-colors hover:bg-ml-blue-light/50 focus:bg-ml-blue-light/60 focus:outline-none dark:hover:bg-slate-800/60 dark:focus:bg-slate-800"
                >
                  {/* N.º de venda */}
                  <td className="whitespace-nowrap px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-slate-900 group-hover:text-ml-blue dark:text-slate-100 dark:group-hover:text-blue-400">
                        {order.order_id}
                      </span>
                      <Eye
                        className="h-3.5 w-3.5 text-ml-blue opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </div>
                  </td>

                  {/* Data */}
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600 dark:text-slate-300">
                    {order.sale_date_br}
                  </td>

                  {/* Produto / SKU */}
                  <td className="max-w-[270px] px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                        {order.sku}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {order.flavor}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {order.listing_id}
                      </span>
                    </div>
                    <p
                      className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400"
                      title={order.listing_title}
                    >
                      {order.listing_title}
                    </p>
                  </td>

                  {/* UF */}
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-center">
                    <span
                      title={order.state}
                      className="inline-flex items-center justify-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {order.state_code}
                    </span>
                  </td>

                  {/* Unid. */}
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {formatIntegerBR(order.units)}
                  </td>

                  {/* Bruto */}
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-slate-800 dark:text-slate-200">
                    {formatCurrencyBRL(order.product_revenue)}
                  </td>

                  {/* Tarifas */}
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-amber-700 dark:text-amber-400">
                    {order.sale_fee > 0
                      ? formatCurrencyBRL(order.sale_fee_deduction)
                      : 'R$ 0,00'}
                  </td>

                  {/* Frete Líq. */}
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-amber-700 dark:text-amber-400">
                    {netShipping !== 0 ? formatCurrencyBRL(netShipping) : 'R$ 0,00'}
                  </td>

                  {/* Líquido (Total BRL) */}
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrencyBRL(order.net_revenue)}
                  </td>

                  {/* Ads */}
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-center">
                    {order.is_ad_sale ? (
                      <span
                        title="Venda originada por Mercado Ads"
                        className="inline-flex items-center gap-1 rounded-md bg-ml-yellow/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-900"
                      >
                        <Megaphone className="h-2.5 w-2.5" aria-hidden="true" />
                        Ads
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Org.
                      </span>
                    )}
                  </td>

                  {/* Prazo */}
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                    {formatDaysBR(order.delivery_days)}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-3.5 py-2.5">
                    <StatusBadge status={order.status} size="sm" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5 text-xs sm:flex-row dark:border-slate-800">
        <p className="text-slate-600 dark:text-slate-400">
          Mostrando{' '}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {startIdx}
          </strong>{' '}
          a{' '}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {endIdx}
          </strong>{' '}
          de{' '}
          <strong className="font-semibold text-slate-900 dark:text-white">
            {formatIntegerBR(total)}
          </strong>{' '}
          pedidos
        </p>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Anterior
          </button>

          <span className="px-2.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
            Página {page} de {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
