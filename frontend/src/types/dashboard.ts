export type TimeGranularity = 'month' | 'week' | 'day';

export type SortDirection = 'asc' | 'desc';

export type SortableOrderField =
  | 'order_id'
  | 'sale_date'
  | 'status'
  | 'units'
  | 'product_revenue'
  | 'shipping_revenue'
  | 'sale_fee'
  | 'shipping_fee'
  | 'cancellation_amount'
  | 'net_revenue'
  | 'total_brl'
  | 'sku'
  | 'listing_id'
  | 'listing_title'
  | 'flavor'
  | 'unit_price'
  | 'customer_id'
  | 'state'
  | 'dispatch_days'
  | 'delivery_days'
  | 'transit_days';

export interface HealthResponse {
  status: string;
  dataset_rows: number;
  active_source: string;
}

export interface DatasetMutationResponse {
  status: string;
  message: string;
  active_source: string;
  dataset_rows: number;
}

export interface SkuFilterOption {
  sku: string;
  listing_id: string;
  title: string;
  flavor: string;
}

export interface ListingFilterOption {
  listing_id: string;
  title: string;
  sku_count: number;
}

export interface FiltersResponse {
  min_date: string;
  max_date: string;
  states: string[];
  skus: string[];
  listings: string[];
  statuses: string[];
  sku_options: SkuFilterOption[];
  listing_options: ListingFilterOption[];
  active_source: string;
  total_rows: number;
}

export type AdSaleFilterValue = 'all' | 'true' | 'false';

export interface DashboardFilterState {
  start_date: string;
  end_date: string;
  state: string;
  sku: string;
  listing_id: string;
  status: string;
  ad_sale: AdSaleFilterValue;
  search: string;
  granularity: TimeGranularity;
}

export interface DashboardKPIs {
  net_revenue: number;
  gross_revenue: number;
  gross_product_revenue_all: number;
  shipping_revenue: number;
  sale_fees: number;
  shipping_fees: number;
  net_shipping_cost: number;
  total_fees: number;
  fee_burden_pct: number;
  net_margin_pct: number;
  total_orders: number;
  realized_orders: number;
  canceled_orders: number;
  cancellation_amount: number;
  cancellation_rate_pct: number;
  mediation_orders: number;
  units_sold: number;
  average_ticket: number;
  gross_average_ticket: number;
  avg_delivery_days: number;
  avg_dispatch_days: number;
  avg_transit_days: number;
  ad_sales_share_pct: number;
}

export interface TimeSeriesPoint {
  period: string;
  label: string;
  gross_revenue: number;
  net_revenue: number;
  sale_fees: number;
  shipping_fees: number;
  shipping_revenue: number;
  orders: number;
  realized_orders: number;
  canceled_orders: number;
  units: number;
}

export interface FinancialBreakdownStep {
  key: string;
  label: string;
  type: 'credit' | 'debit' | 'total';
  value: number;
  abs_value: number;
  running_total: number;
  share_of_gross_pct: number;
}

export interface SkuRankingItem {
  sku: string;
  listing_id: string;
  title: string;
  flavor: string;
  orders: number;
  total_orders: number;
  canceled_orders: number;
  units: number;
  gross_revenue: number;
  net_revenue: number;
  sale_fees: number;
  shipping_fees: number;
  net_margin_pct: number;
  average_price: number;
  share_revenue_pct: number;
}

export interface ListingRankingItem {
  listing_id: string;
  title: string;
  sku_count: number;
  skus: string[];
  orders: number;
  total_orders: number;
  canceled_orders: number;
  units: number;
  gross_revenue: number;
  net_revenue: number;
  sale_fees: number;
  shipping_fees: number;
  net_margin_pct: number;
  share_revenue_pct: number;
}

export interface StateBreakdownItem {
  state: string;
  state_code: string;
  orders: number;
  total_orders: number;
  canceled_orders: number;
  units: number;
  gross_revenue: number;
  net_revenue: number;
  share_pct: number;
  avg_delivery_days: number;
  avg_dispatch_days: number;
  avg_shipping_fee: number;
}

export interface AdsBreakdownItem {
  segment: string;
  is_ad_sale: boolean;
  orders: number;
  total_orders: number;
  canceled_orders: number;
  units: number;
  gross_revenue: number;
  net_revenue: number;
  sale_fees: number;
  shipping_fees: number;
  average_ticket: number;
  gross_average_ticket: number;
  net_margin_pct: number;
  share_revenue_pct: number;
  share_orders_pct: number;
}

export interface StatusBreakdownItem {
  status: string;
  orders: number;
  units: number;
  gross_product_revenue: number;
  net_revenue: number;
  share_orders_pct: number;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  time_series: TimeSeriesPoint[];
  weekly_time_series: TimeSeriesPoint[];
  financial_breakdown: FinancialBreakdownStep[];
  sku_ranking: SkuRankingItem[];
  listing_ranking: ListingRankingItem[];
  state_breakdown: StateBreakdownItem[];
  ads_breakdown: AdsBreakdownItem[];
  status_breakdown: StatusBreakdownItem[];
  active_source: string;
}

export interface OrderRecord {
  order_id: string;
  sale_date: string;
  sale_date_br: string;
  status: string;
  status_description: string;
  is_realized: boolean;
  is_canceled: boolean;
  is_mediation: boolean;
  is_bundle: boolean;
  units: number;
  product_revenue: number;
  shipping_revenue: number;
  sale_fee: number;
  sale_fee_deduction: number;
  shipping_fee: number;
  shipping_fee_deduction: number;
  cancellation_amount: number;
  cancellation_deduction: number;
  net_revenue: number;
  total_brl: number;
  is_ad_sale: boolean;
  sku: string;
  listing_id: string;
  listing_title: string;
  variation: string;
  flavor: string;
  unit_price: number;
  listing_type: string;
  customer_id: string;
  state: string;
  state_code: string;
  country: string;
  delivery_method: string;
  shipped_date: string;
  delivered_date: string;
  dispatch_days: number | null;
  delivery_days: number | null;
  transit_days: number | null;
  has_open_claim: boolean;
  has_closed_claim: boolean;
  in_mediation: boolean;
}

export interface OrdersResponse {
  items: OrderRecord[];
  total: number;
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  sort_by: string;
  sort_dir: SortDirection;
}
