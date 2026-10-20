import React from 'react';
import {
  Calendar,
  Filter,
  FilterX,
  MapPin,
  Megaphone,
  Package,
  Search,
  Tag,
  X,
} from 'lucide-react';
import type {
  AdSaleFilterValue,
  DashboardFilterState,
  FiltersResponse,
} from '../types/dashboard';
import { formatDateBR, getStatusDisplayMeta } from '../utils/formatters';

interface GlobalFilterBarProps {
  filters: DashboardFilterState;
  options: FiltersResponse | null;
  hasActiveFilters: boolean;
  onUpdateFilter: <K extends keyof DashboardFilterState>(
    key: K,
    value: DashboardFilterState[K],
  ) => void;
  onResetFilters: () => void;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  options,
  hasActiveFilters,
  onUpdateFilter,
  onResetFilters,
}) => {
  const minDate = options?.min_date || '';
  const maxDate = options?.max_date || '';

  const isStartDateCustom =
    Boolean(filters.start_date) && filters.start_date !== minDate;
  const isEndDateCustom =
    Boolean(filters.end_date) && filters.end_date !== maxDate;

  const activeChips: Array<{
    key: string;
    label: string;
    onClear: () => void;
  }> = [];

  if (isStartDateCustom || isEndDateCustom) {
    activeChips.push({
      key: 'date',
      label: `Período: ${formatDateBR(filters.start_date || minDate)} até ${formatDateBR(
        filters.end_date || maxDate,
      )}`,
      onClear: () => {
        onUpdateFilter('start_date', minDate);
        onUpdateFilter('end_date', maxDate);
      },
    });
  }

  if (filters.state && filters.state !== 'all') {
    activeChips.push({
      key: 'state',
      label: `UF: ${filters.state}`,
      onClear: () => onUpdateFilter('state', 'all'),
    });
  }

  if (filters.sku && filters.sku !== 'all') {
    const skuOpt = options?.sku_options.find((s) => s.sku === filters.sku);
    activeChips.push({
      key: 'sku',
      label: skuOpt ? `SKU: ${skuOpt.sku} (${skuOpt.flavor})` : `SKU: ${filters.sku}`,
      onClear: () => onUpdateFilter('sku', 'all'),
    });
  }

  if (filters.listing_id && filters.listing_id !== 'all') {
    activeChips.push({
      key: 'listing_id',
      label: `Anúncio: ${filters.listing_id}`,
      onClear: () => onUpdateFilter('listing_id', 'all'),
    });
  }

  if (filters.status && filters.status !== 'all') {
    const statusMeta = getStatusDisplayMeta(filters.status);
    activeChips.push({
      key: 'status',
      label: `Status: ${statusMeta.shortLabel}`,
      onClear: () => onUpdateFilter('status', 'all'),
    });
  }

  if (filters.ad_sale && filters.ad_sale !== 'all') {
    activeChips.push({
      key: 'ad_sale',
      label:
        filters.ad_sale === 'true'
          ? 'Canal: Com Publicidade (Ads)'
          : 'Canal: Orgânico',
      onClear: () => onUpdateFilter('ad_sale', 'all'),
    });
  }

  if (filters.search.trim()) {
    activeChips.push({
      key: 'search',
      label: `Busca: "${filters.search.trim()}"`,
      onClear: () => onUpdateFilter('search', ''),
    });
  }

  const inputBaseClass =
    'w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 transition-colors focus:border-ml-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-ml-blue/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-ml-blue dark:focus:bg-slate-800';

  return (
    <section
      aria-label="Barra global de filtros"
      className="mb-6 rounded-xl border border-slate-200/90 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-surface-dark-card"
    >
      {/* Top Row: Search + Date Bounds + Reset */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        {/* Search Input */}
        <div className="sm:col-span-2 lg:col-span-4">
          <label
            htmlFor="filter-search"
            className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
          >
            <Search className="h-3 w-3 text-ml-blue" aria-hidden="true" />
            Buscar pedido, cliente, SKU ou produto
          </label>
          <div className="relative">
            <input
              id="filter-search"
              type="text"
              value={filters.search}
              onChange={(e) => onUpdateFilter('search', e.target.value)}
              placeholder="Ex.: 200000499, CHOCOTINE, MLB3179..."
              className={`${inputBaseClass} pr-7`}
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onUpdateFilter('search', '')}
                aria-label="Limpar busca textual"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Start Date */}
        <div className="lg:col-span-2">
          <label
            htmlFor="filter-start-date"
            className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
          >
            <Calendar className="h-3 w-3 text-ml-blue" aria-hidden="true" />
            Data inicial
          </label>
          <input
            id="filter-start-date"
            type="date"
            min={minDate}
            max={filters.end_date || maxDate}
            value={filters.start_date}
            onChange={(e) => onUpdateFilter('start_date', e.target.value)}
            className={inputBaseClass}
          />
        </div>

        {/* End Date */}
        <div className="lg:col-span-2">
          <label
            htmlFor="filter-end-date"
            className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
          >
            <Calendar className="h-3 w-3 text-ml-blue" aria-hidden="true" />
            Data final
          </label>
          <input
            id="filter-end-date"
            type="date"
            min={filters.start_date || minDate}
            max={maxDate}
            value={filters.end_date}
            onChange={(e) => onUpdateFilter('end_date', e.target.value)}
            className={inputBaseClass}
          />
        </div>

        {/* State / UF */}
        <div className="lg:col-span-2">
          <label
            htmlFor="filter-state"
            className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
          >
            <MapPin className="h-3 w-3 text-ml-blue" aria-hidden="true" />
            Estado / UF
          </label>
          <select
            id="filter-state"
            value={filters.state}
            onChange={(e) => onUpdateFilter('state', e.target.value)}
            className={inputBaseClass}
          >
            <option value="all">Todos os estados</option>
            {options?.states.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Channel / Ads */}
        <div className="lg:col-span-2">
          <label
            htmlFor="filter-ads"
            className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
          >
            <Megaphone className="h-3 w-3 text-ml-blue" aria-hidden="true" />
            Canal / Publicidade
          </label>
          <select
            id="filter-ads"
            value={filters.ad_sale}
            onChange={(e) =>
              onUpdateFilter('ad_sale', e.target.value as AdSaleFilterValue)
            }
            className={inputBaseClass}
          >
            <option value="all">Todas as vendas</option>
            <option value="true">Com Publicidade (Ads)</option>
            <option value="false">Orgânico (Sem Ads)</option>
          </select>
        </div>
      </div>

      {/* Second Row: Product SKU + Listing MLB + Status + Limpar Filtros */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
        {/* Product / SKU */}
        <div className="lg:col-span-4">
          <label
            htmlFor="filter-sku"
            className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
          >
            <Package className="h-3 w-3 text-ml-blue" aria-hidden="true" />
            Produto / SKU (Sabor)
          </label>
          <select
            id="filter-sku"
            value={filters.sku}
            onChange={(e) => onUpdateFilter('sku', e.target.value)}
            className={inputBaseClass}
          >
            <option value="all">Todos os SKUs ({options?.skus.length ?? 0})</option>
            {options?.sku_options && options.sku_options.length > 0
              ? options.sku_options.map((opt) => (
                  <option key={opt.sku} value={opt.sku}>
                    {opt.sku} — {opt.flavor}
                  </option>
                ))
              : options?.skus.map((sku) => (
                  <option key={sku} value={sku}>
                    {sku}
                  </option>
                ))}
          </select>
        </div>

        {/* Listing ID (# de anúncio MLB) */}
        <div className="lg:col-span-4">
          <label
            htmlFor="filter-listing"
            className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
          >
            <Tag className="h-3 w-3 text-ml-blue" aria-hidden="true" />
            Anúncio MLB (# de anúncio)
          </label>
          <select
            id="filter-listing"
            value={filters.listing_id}
            onChange={(e) => onUpdateFilter('listing_id', e.target.value)}
            className={inputBaseClass}
          >
            <option value="all">
              Todos os anúncios ({options?.listings.length ?? 0})
            </option>
            {options?.listing_options && options.listing_options.length > 0
              ? options.listing_options.map((opt) => (
                  <option key={opt.listing_id} value={opt.listing_id}>
                    {opt.listing_id} ({opt.sku_count}{' '}
                    {opt.sku_count === 1 ? 'SKU' : 'SKUs'}) —{' '}
                    {opt.title.slice(0, 42)}
                    {opt.title.length > 42 ? '…' : ''}
                  </option>
                ))
              : options?.listings.map((lid) => (
                  <option key={lid} value={lid}>
                    {lid}
                  </option>
                ))}
          </select>
        </div>

        {/* Order Status */}
        <div className="lg:col-span-2">
          <label
            htmlFor="filter-status"
            className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400"
          >
            <Filter className="h-3 w-3 text-ml-blue" aria-hidden="true" />
            Status da Venda
          </label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(e) => onUpdateFilter('status', e.target.value)}
            className={inputBaseClass}
          >
            <option value="all">Todos os status</option>
            {options?.statuses.map((st) => {
              const meta = getStatusDisplayMeta(st);
              return (
                <option key={st} value={st}>
                  {meta.shortLabel} ({st})
                </option>
              );
            })}
          </select>
        </div>

        {/* Limpar Filtros Button */}
        <div className="lg:col-span-2 flex items-end">
          <button
            type="button"
            disabled={!hasActiveFilters}
            onClick={onResetFilters}
            className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              hasActiveFilters
                ? 'bg-ml-blue text-white shadow-sm hover:bg-ml-blue-hover focus:outline-none focus:ring-2 focus:ring-ml-blue/40'
                : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-600'
            }`}
          >
            <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Limpar Filtros</span>
          </button>
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Filtros ativos:
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-ml-blue/25 bg-ml-blue-light px-2.5 py-0.5 text-xs font-medium text-ml-navy dark:border-ml-blue/40 dark:bg-ml-blue/15 dark:text-blue-200"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onClear}
                aria-label={`Remover filtro ${chip.label}`}
                className="rounded-full p-0.5 hover:bg-ml-blue/20"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
};
