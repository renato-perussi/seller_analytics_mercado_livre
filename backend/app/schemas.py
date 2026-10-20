"""Pydantic schemas for the Mercado Livre Sales Analytics API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: str = "ok"
    dataset_rows: int
    active_source: str


class DatasetMutationResponse(BaseModel):
    """Response schema for CSV upload and dataset reset operations."""

    status: str = "ok"
    message: str
    active_source: str
    dataset_rows: int


class SkuFilterOption(BaseModel):
    """Enriched SKU option for filter dropdowns."""

    sku: str
    listing_id: str
    title: str
    flavor: str


class ListingFilterOption(BaseModel):
    """Enriched listing option for filter dropdowns."""

    listing_id: str
    title: str
    sku_count: int


class FiltersResponse(BaseModel):
    """Available filter values derived from the active dataset."""

    min_date: str
    max_date: str
    states: list[str]
    skus: list[str]
    listings: list[str]
    statuses: list[str]
    sku_options: list[SkuFilterOption] = Field(default_factory=list)
    listing_options: list[ListingFilterOption] = Field(default_factory=list)
    active_source: str
    total_rows: int


class DashboardFilterParams(BaseModel):
    """Filter parameters shared across dashboard and order listing endpoints."""

    start_date: str | None = None
    end_date: str | None = None
    state: str | None = None
    sku: str | None = None
    listing_id: str | None = None
    status: str | None = None
    ad_sale: bool | None = None
    search: str | None = None
    granularity: Literal["month", "week", "day"] = "month"


class DashboardKPIs(BaseModel):
    """Executive KPI metrics for the filtered sales dataset."""

    net_revenue: float
    gross_revenue: float
    gross_product_revenue_all: float
    shipping_revenue: float
    sale_fees: float
    shipping_fees: float
    net_shipping_cost: float
    total_fees: float
    fee_burden_pct: float
    net_margin_pct: float
    total_orders: int
    realized_orders: int
    canceled_orders: int
    cancellation_amount: float
    cancellation_rate_pct: float
    mediation_orders: int
    units_sold: int
    average_ticket: float
    gross_average_ticket: float
    avg_delivery_days: float
    avg_dispatch_days: float
    avg_transit_days: float
    ad_sales_share_pct: float


class TimeSeriesPoint(BaseModel):
    """Time series data point aggregated by month, week, or day."""

    period: str
    label: str
    gross_revenue: float
    net_revenue: float
    sale_fees: float
    shipping_fees: float
    shipping_revenue: float
    orders: int
    realized_orders: int
    canceled_orders: int
    units: int


class FinancialBreakdownStep(BaseModel):
    """Waterfall step decomposing Gross Revenue into Net Revenue (Total BRL)."""

    key: str
    label: str
    type: Literal["credit", "debit", "total"]
    value: float
    abs_value: float
    running_total: float
    share_of_gross_pct: float


class SkuRankingItem(BaseModel):
    """Performance metrics grouped by product SKU."""

    sku: str
    listing_id: str
    title: str
    flavor: str
    orders: int
    total_orders: int
    canceled_orders: int
    units: int
    gross_revenue: float
    net_revenue: float
    sale_fees: float
    shipping_fees: float
    net_margin_pct: float
    average_price: float
    share_revenue_pct: float


class ListingRankingItem(BaseModel):
    """Performance metrics grouped by Mercado Livre listing ID (# de anúncio)."""

    listing_id: str
    title: str
    sku_count: int
    skus: list[str]
    orders: int
    total_orders: int
    canceled_orders: int
    units: int
    gross_revenue: float
    net_revenue: float
    sale_fees: float
    shipping_fees: float
    net_margin_pct: float
    share_revenue_pct: float


class StateBreakdownItem(BaseModel):
    """Geographic and logistics performance metrics grouped by Brazilian state (UF)."""

    state: str
    state_code: str
    orders: int
    total_orders: int
    canceled_orders: int
    units: int
    gross_revenue: float
    net_revenue: float
    share_pct: float
    avg_delivery_days: float
    avg_dispatch_days: float
    avg_shipping_fee: float


class AdsBreakdownItem(BaseModel):
    """Comparison metrics between Mercado Ads sales and Organic sales."""

    segment: str
    is_ad_sale: bool
    orders: int
    total_orders: int
    canceled_orders: int
    units: int
    gross_revenue: float
    net_revenue: float
    sale_fees: float
    shipping_fees: float
    average_ticket: float
    gross_average_ticket: float
    net_margin_pct: float
    share_revenue_pct: float
    share_orders_pct: float


class StatusBreakdownItem(BaseModel):
    """Order and revenue breakdown by order status."""

    status: str
    orders: int
    units: int
    gross_product_revenue: float
    net_revenue: float
    share_orders_pct: float


class DashboardResponse(BaseModel):
    """Complete analytical payload for the dashboard view."""

    kpis: DashboardKPIs
    time_series: list[TimeSeriesPoint]
    weekly_time_series: list[TimeSeriesPoint]
    financial_breakdown: list[FinancialBreakdownStep]
    sku_ranking: list[SkuRankingItem]
    listing_ranking: list[ListingRankingItem]
    state_breakdown: list[StateBreakdownItem]
    ads_breakdown: list[AdsBreakdownItem]
    status_breakdown: list[StatusBreakdownItem]
    active_source: str


class OrderRecord(BaseModel):
    """Normalized individual order record for operational table inspection."""

    order_id: str
    sale_date: str
    sale_date_br: str
    status: str
    status_description: str
    is_realized: bool
    is_canceled: bool
    is_mediation: bool
    is_bundle: bool
    units: int
    product_revenue: float
    shipping_revenue: float
    sale_fee: float
    sale_fee_deduction: float
    shipping_fee: float
    shipping_fee_deduction: float
    cancellation_amount: float
    cancellation_deduction: float
    net_revenue: float
    total_brl: float
    is_ad_sale: bool
    sku: str
    listing_id: str
    listing_title: str
    variation: str
    flavor: str
    unit_price: float
    listing_type: str
    customer_id: str
    state: str
    state_code: str
    country: str
    delivery_method: str
    shipped_date: str
    delivered_date: str
    dispatch_days: float | None
    delivery_days: float | None
    transit_days: float | None
    has_open_claim: bool
    has_closed_claim: bool
    in_mediation: bool


class OrdersResponse(BaseModel):
    """Paginated response of normalized order records."""

    items: list[OrderRecord]
    total: int
    total_count: int
    page: int
    page_size: int
    total_pages: int
    sort_by: str
    sort_dir: Literal["asc", "desc"]
