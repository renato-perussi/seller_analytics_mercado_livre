import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAllOrdersForExport,
  fetchDashboard,
  fetchFilters,
  fetchOrders,
  resetDataset,
  uploadDatasetCsv,
} from './api/client';
import { AdsAndStatusPanel } from './components/charts/AdsAndStatusPanel';
import { FinancialBreakdownChart } from './components/charts/FinancialBreakdownChart';
import { ProductRankingPanel } from './components/charts/ProductRankingPanel';
import { SalesEvolutionChart } from './components/charts/SalesEvolutionChart';
import { StatePerformancePanel } from './components/charts/StatePerformancePanel';
import {
  DashboardErrorState,
  DashboardSkeleton,
  EmptyFilterState,
  FeedbackBanner,
  type FeedbackNotice,
} from './components/DashboardStates';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import { Header } from './components/Header';
import { KpiSection } from './components/KpiSection';
import { OrderDetailModal } from './components/OrderDetailModal';
import { OrdersTable } from './components/OrdersTable';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useTheme } from './hooks/useTheme';
import type {
  DashboardFilterState,
  DashboardResponse,
  FiltersResponse,
  OrderRecord,
  OrdersResponse,
  SortDirection,
} from './types/dashboard';
import { exportOrdersToCsv } from './utils/formatters';

const INITIAL_FILTERS: DashboardFilterState = {
  start_date: '',
  end_date: '',
  state: 'all',
  sku: 'all',
  listing_id: 'all',
  status: 'all',
  ad_sale: 'all',
  search: '',
  granularity: 'month',
};

export const App: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  const [filterOptions, setFilterOptions] = useState<FiltersResponse | null>(
    null,
  );
  const [filters, setFilters] = useState<DashboardFilterState>(INITIAL_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null,
  );
  const [ordersData, setOrdersData] = useState<OrdersResponse | null>(null);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sortBy, setSortBy] = useState<string>('sale_date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState<number>(0);

  const effectiveFilters = useMemo<DashboardFilterState>(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  );

  const hasActiveFilters = useMemo<boolean>(() => {
    const minDate = filterOptions?.min_date || '';
    const maxDate = filterOptions?.max_date || '';
    return (
      (Boolean(filters.start_date) && filters.start_date !== minDate) ||
      (Boolean(filters.end_date) && filters.end_date !== maxDate) ||
      filters.state !== 'all' ||
      filters.sku !== 'all' ||
      filters.listing_id !== 'all' ||
      filters.status !== 'all' ||
      filters.ad_sale !== 'all' ||
      filters.search.trim() !== ''
    );
  }, [filters, filterOptions]);

  // 1. Load initial filter metadata
  const loadFilterMetadata = useCallback(async (resetDates = true) => {
    const meta = await fetchFilters();
    setFilterOptions(meta);
    if (resetDates) {
      setFilters((prev) => ({
        ...prev,
        start_date: meta.min_date,
        end_date: meta.max_date,
      }));
    }
    return meta;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadFilterMetadata(true).catch((err: unknown) => {
      if (!cancelled) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar metadados de filtros da API.',
        );
        setIsInitialLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadFilterMetadata]);

  // 2. Load dashboard KPIs & charts whenever effective filters or reloadToken change
  useEffect(() => {
    if (!filterOptions) return;
    let cancelled = false;
    setErrorMessage(null);

    fetchDashboard(effectiveFilters)
      .then((res) => {
        if (!cancelled) {
          setDashboardData(res);
          setIsInitialLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Falha ao consultar dados analíticos do painel.',
          );
          setIsInitialLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveFilters, filterOptions, reloadToken]);

  // 3. Load paginated orders whenever effective filters, page, pageSize, sortBy, sortDir change
  useEffect(() => {
    if (!filterOptions) return;
    let cancelled = false;
    setIsOrdersLoading(true);

    fetchOrders({
      filters: effectiveFilters,
      page,
      pageSize,
      sortBy,
      sortDir,
    })
      .then((res) => {
        if (!cancelled) {
          setOrdersData(res);
          setIsOrdersLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsOrdersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveFilters, filterOptions, page, pageSize, sortBy, sortDir, reloadToken]);

  const handleUpdateFilter = useCallback(
    <K extends keyof DashboardFilterState>(
      key: K,
      value: DashboardFilterState[K],
    ) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
      if (key !== 'granularity') {
        setPage(1);
      }
    },
    [],
  );

  const handleResetFilters = useCallback(() => {
    setFilters((prev) => ({
      ...INITIAL_FILTERS,
      start_date: filterOptions?.min_date || '',
      end_date: filterOptions?.max_date || '',
      granularity: prev.granularity,
    }));
    setPage(1);
  }, [filterOptions]);

  const handleSortChange = useCallback(
    (column: string) => {
      if (sortBy === column) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(column);
        setSortDir('desc');
      }
      setPage(1);
    },
    [sortBy],
  );

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  const handleUploadCsv = async (file: File) => {
    setIsUploading(true);
    setFeedbackNotice(null);
    try {
      const mutation = await uploadDatasetCsv(file);
      const newMeta = await loadFilterMetadata(true);
      setFilters({
        ...INITIAL_FILTERS,
        start_date: newMeta.min_date,
        end_date: newMeta.max_date,
      });
      setPage(1);
      setReloadToken((c) => c + 1);
      setFeedbackNotice({
        type: 'success',
        message: `Arquivo "${mutation.active_source}" importado com sucesso (${mutation.dataset_rows} pedidos analisados).`,
      });
    } catch (err: unknown) {
      setFeedbackNotice({
        type: 'error',
        message:
          err instanceof Error
            ? `Falha ao importar CSV: ${err.message}`
            : 'Não foi possível importar o arquivo CSV enviado.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetDataset = async () => {
    setIsUploading(true);
    setFeedbackNotice(null);
    try {
      const mutation = await resetDataset();
      const newMeta = await loadFilterMetadata(true);
      setFilters({
        ...INITIAL_FILTERS,
        start_date: newMeta.min_date,
        end_date: newMeta.max_date,
      });
      setPage(1);
      setReloadToken((c) => c + 1);
      setFeedbackNotice({
        type: 'success',
        message: `Base restaurada para o padrão "${mutation.active_source}" (${mutation.dataset_rows} pedidos).`,
      });
    } catch (err: unknown) {
      setFeedbackNotice({
        type: 'error',
        message:
          err instanceof Error
            ? `Falha ao restaurar dataset: ${err.message}`
            : 'Erro ao restaurar dataset padrão.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const records = await fetchAllOrdersForExport(
        effectiveFilters,
        sortBy,
        sortDir,
      );
      exportOrdersToCsv(
        records,
        `mercado_livre_vendas_${filterOptions?.active_source.replace('.csv', '') || '2023'}.csv`,
      );
    } catch (err: unknown) {
      setFeedbackNotice({
        type: 'error',
        message:
          err instanceof Error
            ? `Erro ao exportar CSV: ${err.message}`
            : 'Não foi possível exportar os pedidos filtrados.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRetry = () => {
    setIsInitialLoading(true);
    setErrorMessage(null);
    loadFilterMetadata(false)
      .then(() => setReloadToken((c) => c + 1))
      .catch((err: unknown) => {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Erro ao reconectar com o servidor da API.',
        );
        setIsInitialLoading(false);
      });
  };

  const activeSource =
    dashboardData?.active_source ??
    filterOptions?.active_source ??
    'sales_2023.csv';
  const totalDatasetRows = filterOptions?.total_rows ?? 0;
  const filteredRows =
    dashboardData?.kpis.total_orders ?? ordersData?.total ?? totalDatasetRows;

  return (
    <div className="min-h-screen flex flex-col bg-surface-light text-slate-900 dark:bg-surface-dark dark:text-slate-100">
      {/* Top Mercado Livre Seller Center Header */}
      <Header
        activeSource={activeSource}
        totalRows={totalDatasetRows}
        filteredRows={filteredRows}
        isUploading={isUploading}
        isExporting={isExporting}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onUploadFile={handleUploadCsv}
        onResetDataset={handleResetDataset}
        onExportCsv={handleExportCsv}
      />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Upload / Reset Feedback Banner */}
        <FeedbackBanner
          notice={feedbackNotice}
          onDismiss={() => setFeedbackNotice(null)}
        />

        {/* Global Controls / Filter Bar */}
        <GlobalFilterBar
          filters={filters}
          options={filterOptions}
          hasActiveFilters={hasActiveFilters}
          onUpdateFilter={handleUpdateFilter}
          onResetFilters={handleResetFilters}
        />

        {/* Error, Loading, Empty, or 3-Tier Analytical Dashboard */}
        {errorMessage ? (
          <DashboardErrorState message={errorMessage} onRetry={handleRetry} />
        ) : isInitialLoading || !dashboardData ? (
          <DashboardSkeleton />
        ) : dashboardData.kpis.total_orders === 0 ? (
          <EmptyFilterState onResetFilters={handleResetFilters} />
        ) : (
          <>
            {/* LEVEL 1 — EXECUTIVE SUMMARY (5 KPI Cards) */}
            <KpiSection kpis={dashboardData.kpis} />

            {/* LEVEL 2 — ANALYTICAL CONTEXT (Row 1: Time Series + Financial Waterfall) */}
            <section
              aria-label="Evolução temporal e conciliação financeira"
              className="mb-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12"
            >
              <div className="flex lg:col-span-7">
                <SalesEvolutionChart
                  data={dashboardData.time_series}
                  granularity={filters.granularity}
                  onChangeGranularity={(g) =>
                    handleUpdateFilter('granularity', g)
                  }
                  isDark={isDark}
                />
              </div>
              <div className="flex lg:col-span-5">
                <FinancialBreakdownChart
                  steps={dashboardData.financial_breakdown}
                  isDark={isDark}
                />
              </div>
            </section>

            {/* LEVEL 2 — ANALYTICAL CONTEXT (Row 2: Product Ranking + State Performance) */}
            <section
              aria-label="Ranking de produtos e desempenho por estado"
              className="mb-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12"
            >
              <div className="flex lg:col-span-6">
                <ProductRankingPanel
                  skuRanking={dashboardData.sku_ranking}
                  listingRanking={dashboardData.listing_ranking}
                  selectedSku={filters.sku}
                  selectedListingId={filters.listing_id}
                  onSelectSku={(sku) => handleUpdateFilter('sku', sku)}
                  onSelectListingId={(lid) =>
                    handleUpdateFilter('listing_id', lid)
                  }
                  isDark={isDark}
                />
              </div>
              <div className="flex lg:col-span-6">
                <StatePerformancePanel
                  states={dashboardData.state_breakdown}
                  selectedState={filters.state}
                  onSelectState={(st) => handleUpdateFilter('state', st)}
                  isDark={isDark}
                />
              </div>
            </section>

            {/* LEVEL 2 — ANALYTICAL CONTEXT (Row 3: Ads Efficiency & Order Status Breakdown) */}
            <AdsAndStatusPanel
              adsBreakdown={dashboardData.ads_breakdown}
              statusBreakdown={dashboardData.status_breakdown}
              selectedAdSale={filters.ad_sale}
              selectedStatus={filters.status}
              onSelectAdSale={(ad) => handleUpdateFilter('ad_sale', ad)}
              onSelectStatus={(st) => handleUpdateFilter('status', st)}
              isDark={isDark}
            />

            {/* LEVEL 3 — OPERATIONAL DETAIL (Paginated & Sortable Orders Table) */}
            <OrdersTable
              ordersData={ordersData}
              isLoading={isOrdersLoading}
              sortBy={sortBy}
              sortDir={sortDir}
              page={page}
              pageSize={pageSize}
              onSortChange={handleSortChange}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              onSelectOrder={setSelectedOrder}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-surface-dark-card dark:text-slate-400">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
          <span>
            <strong>Mercado Livre Seller Analytics</strong> • Painel Executivo &
            Operacional de Vendas
          </span>
          <span>
            Valores conciliados em Real Brasileiro (BRL) • Datas no padrão{' '}
            <code className="font-mono">DD/MM/AAAA</code>
          </span>
        </div>
      </footer>

      {/* Order Detail Modal / Drawer */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
};

export default App;
