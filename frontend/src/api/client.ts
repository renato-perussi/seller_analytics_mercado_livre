import type {
  DashboardFilterState,
  DashboardResponse,
  DatasetMutationResponse,
  FiltersResponse,
  HealthResponse,
  OrderRecord,
  OrdersResponse,
  SortDirection,
} from '../types/dashboard';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `Erro HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload && typeof payload.detail === 'string') {
        errorDetail = payload.detail;
      }
    } catch {
      // Ignore JSON parse errors on non-JSON error responses
    }
    throw new ApiError(errorDetail, response.status);
  }
  return (await response.json()) as T;
}

function buildFilterSearchParams(
  filters: Partial<DashboardFilterState>,
  extraParams?: Record<string, string | number | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  if (filters.state && filters.state !== 'all') params.set('state', filters.state);
  if (filters.sku && filters.sku !== 'all') params.set('sku', filters.sku);
  if (filters.listing_id && filters.listing_id !== 'all') {
    params.set('listing_id', filters.listing_id);
  }
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.ad_sale && filters.ad_sale !== 'all') {
    params.set('ad_sale', filters.ad_sale);
  }
  if (filters.search && filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.granularity) {
    params.set('granularity', filters.granularity);
  }

  if (extraParams) {
    for (const [key, val] of Object.entries(extraParams)) {
      if (val !== undefined && val !== '') {
        params.set(key, String(val));
      }
    }
  }

  return params;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  return handleJsonResponse<HealthResponse>(response);
}

export async function fetchFilters(): Promise<FiltersResponse> {
  const response = await fetch(`${API_BASE_URL}/api/filters`);
  return handleJsonResponse<FiltersResponse>(response);
}

export async function fetchDashboard(
  filters: Partial<DashboardFilterState>,
): Promise<DashboardResponse> {
  const query = buildFilterSearchParams(filters);
  const response = await fetch(`${API_BASE_URL}/api/dashboard?${query.toString()}`);
  return handleJsonResponse<DashboardResponse>(response);
}

export interface FetchOrdersOptions {
  filters: Partial<DashboardFilterState>;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDirection;
}

export async function fetchOrders({
  filters,
  page = 1,
  pageSize = 20,
  sortBy = 'sale_date',
  sortDir = 'desc',
}: FetchOrdersOptions): Promise<OrdersResponse> {
  const query = buildFilterSearchParams(filters, {
    page,
    page_size: pageSize,
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  const response = await fetch(`${API_BASE_URL}/api/orders?${query.toString()}`);
  return handleJsonResponse<OrdersResponse>(response);
}

export async function fetchAllOrdersForExport(
  filters: Partial<DashboardFilterState>,
  sortBy = 'sale_date',
  sortDir: SortDirection = 'desc',
): Promise<OrderRecord[]> {
  const firstPage = await fetchOrders({
    filters,
    page: 1,
    pageSize: 200,
    sortBy,
    sortDir,
  });
  const allItems: OrderRecord[] = [...firstPage.items];
  for (let page = 2; page <= firstPage.total_pages; page += 1) {
    const nextPage = await fetchOrders({
      filters,
      page,
      pageSize: 200,
      sortBy,
      sortDir,
    });
    allItems.push(...nextPage.items);
  }
  return allItems;
}

export async function uploadDatasetCsv(file: File): Promise<DatasetMutationResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleJsonResponse<DatasetMutationResponse>(response);
}

export async function resetDataset(): Promise<DatasetMutationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/reset-dataset`, {
    method: 'POST',
  });
  return handleJsonResponse<DatasetMutationResponse>(response);
}
