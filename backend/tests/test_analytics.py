"""Unit tests for the analytical engine and KPI calculations."""

from __future__ import annotations

import pandas as pd
import pytest

from backend.app.analytics import (
    apply_filters,
    build_dashboard_response,
    compute_ads_breakdown,
    compute_financial_breakdown,
    compute_kpis,
    compute_listing_ranking,
    compute_sku_ranking,
    compute_state_breakdown,
    compute_status_breakdown,
    compute_time_series,
    get_available_filters,
    get_paginated_orders,
)
from backend.app.data_loader import DEFAULT_CSV_PATH, load_sales_dataframe
from backend.app.schemas import DashboardFilterParams


@pytest.fixture(scope="module")
def sales_df() -> pd.DataFrame:
    """Load the normalized 2023 sales dataset."""
    return load_sales_dataframe(DEFAULT_CSV_PATH)


def test_kpis_exact_reconciliation(sales_df: pd.DataFrame) -> None:
    """Verify executive KPIs match exact verified dataset totals and reconcile to the cent."""
    kpis = compute_kpis(sales_df)

    assert kpis.total_orders == 99
    assert kpis.realized_orders == 95
    assert kpis.canceled_orders == 4
    assert kpis.mediation_orders == 1
    assert kpis.units_sold == 111

    assert kpis.net_revenue == pytest.approx(9040.83)
    assert kpis.gross_revenue == pytest.approx(12114.22)
    assert kpis.gross_product_revenue_all == pytest.approx(12823.28)
    assert kpis.shipping_revenue == pytest.approx(531.83)
    assert kpis.sale_fees == pytest.approx(1657.06)
    assert kpis.shipping_fees == pytest.approx(1948.16)
    assert kpis.net_shipping_cost == pytest.approx(1416.33)
    assert kpis.total_fees == pytest.approx(3605.22)
    assert kpis.cancellation_amount == pytest.approx(543.16)

    # Realized revenue reconciliation to the exact cent
    realized_net = round(
        kpis.gross_revenue + kpis.shipping_revenue - kpis.sale_fees - kpis.shipping_fees,
        2,
    )
    assert realized_net == pytest.approx(kpis.net_revenue, abs=1e-2)

    assert kpis.net_margin_pct == pytest.approx(74.63)
    assert kpis.fee_burden_pct == pytest.approx(28.51)
    assert kpis.cancellation_rate_pct == pytest.approx(4.04)
    assert kpis.average_ticket == pytest.approx(95.17)
    assert kpis.gross_average_ticket == pytest.approx(127.52)
    assert kpis.avg_delivery_days == pytest.approx(7.04)
    assert kpis.avg_dispatch_days == pytest.approx(1.08)
    assert kpis.ad_sales_share_pct == pytest.approx(47.37)


def test_financial_breakdown_waterfall_reconciles_to_cent(sales_df: pd.DataFrame) -> None:
    """Verify the waterfall steps sum to Total (BRL) to the exact cent."""
    steps = compute_financial_breakdown(sales_df)
    assert len(steps) == 6

    step_map = {s.key: s for s in steps}
    assert step_map["gross_product_revenue"].value == pytest.approx(12823.28)
    assert step_map["shipping_revenue"].value == pytest.approx(604.59)
    assert step_map["sale_fees"].value == pytest.approx(-1742.16)
    assert step_map["shipping_fees"].value == pytest.approx(-2101.72)
    assert step_map["cancellations"].value == pytest.approx(-543.16)
    assert step_map["net_revenue"].value == pytest.approx(9040.83)

    non_total_sum = round(sum(s.value for s in steps if s.type != "total"), 2)
    assert non_total_sum == pytest.approx(step_map["net_revenue"].value, abs=1e-2)
    assert steps[-1].running_total == pytest.approx(9040.83)


def test_time_series_monthly_and_weekly_totals(sales_df: pd.DataFrame) -> None:
    """Verify monthly and weekly time series sum to total dataset KPIs."""
    monthly = compute_time_series(sales_df, granularity="month")
    assert len(monthly) == 8  # Jan, Feb, Mar, Apr, May, Jun, Jul, Sep 2023
    assert monthly[0].period == "2023-01"
    assert monthly[0].label == "Jan/23"
    assert monthly[-1].period == "2023-09"
    assert monthly[-1].label == "Set/23"

    assert round(sum(p.net_revenue for p in monthly), 2) == pytest.approx(9040.83)
    assert round(sum(p.gross_revenue for p in monthly), 2) == pytest.approx(12114.22)
    assert sum(p.orders for p in monthly) == 99
    assert sum(p.realized_orders for p in monthly) == 95
    assert sum(p.canceled_orders for p in monthly) == 4
    assert sum(p.units for p in monthly) == 111

    weekly = compute_time_series(sales_df, granularity="week")
    assert len(weekly) > 8
    assert round(sum(p.net_revenue for p in weekly), 2) == pytest.approx(9040.83)


def test_sku_and_listing_rankings(sales_df: pd.DataFrame) -> None:
    """Verify SKU ranking and Listing ranking preserve hierarchy and sum to realized totals."""
    sku_ranking = compute_sku_ranking(sales_df)
    listing_ranking = compute_listing_ranking(sales_df)

    assert len(sku_ranking) == 15
    assert len(listing_ranking) == 10

    assert round(sum(item.net_revenue for item in sku_ranking), 2) == pytest.approx(9040.83)
    assert round(sum(item.gross_revenue for item in sku_ranking), 2) == pytest.approx(12114.22)
    assert sum(item.units for item in sku_ranking) == 111

    assert round(sum(item.net_revenue for item in listing_ranking), 2) == pytest.approx(9040.83)
    assert round(sum(item.gross_revenue for item in listing_ranking), 2) == pytest.approx(12114.22)

    # Top SKU should be CREAMONO-GROWTH-250G
    assert sku_ranking[0].sku == "CREAMONO-GROWTH-250G"
    assert sku_ranking[0].orders == 38
    assert sku_ranking[0].canceled_orders == 2

    # Check Peanut Chocotine flavor in SKU ranking
    peanut_sku = next(item for item in sku_ranking if item.sku == "PEANUT-CHOCOTINE-600G")
    assert peanut_sku.flavor == "Chocotine"

    # Check multi-SKU listings in listing_ranking
    whey_listing = next(item for item in listing_ranking if item.listing_id == "MLB2787409678")
    assert whey_listing.sku_count == 4
    kit_listing = next(item for item in listing_ranking if item.listing_id == "MLB3179617242")
    assert kit_listing.sku_count == 3


def test_state_ads_and_status_breakdowns(sales_df: pd.DataFrame) -> None:
    """Verify state, ads, and status breakdowns reconcile with dataset totals."""
    states = compute_state_breakdown(sales_df)
    assert len(states) == 13
    assert states[0].state == "São Paulo"
    assert states[0].state_code == "SP"
    assert round(sum(s.net_revenue for s in states), 2) == pytest.approx(9040.83)

    ads = compute_ads_breakdown(sales_df)
    assert len(ads) == 2
    assert {a.segment for a in ads} == {"Com Publicidade (Ads)", "Orgânico"}
    assert round(sum(a.net_revenue for a in ads), 2) == pytest.approx(9040.83)
    assert sum(a.orders for a in ads) == 95

    statuses = compute_status_breakdown(sales_df)
    assert len(statuses) == 3
    assert sum(s.orders for s in statuses) == 99
    assert round(sum(s.gross_product_revenue for s in statuses), 2) == pytest.approx(12823.28)
    assert round(sum(s.net_revenue for s in statuses), 2) == pytest.approx(9040.83)


def test_filtering_and_search(sales_df: pd.DataFrame) -> None:
    """Verify filtering by date, state, SKU, listing, status, ads, and free-text search."""
    # Filter by state
    sp_df = apply_filters(sales_df, DashboardFilterParams(state="São Paulo"))
    assert len(sp_df) > 0
    assert (sp_df["state"] == "São Paulo").all()

    # Filter by UF code
    mg_df = apply_filters(sales_df, DashboardFilterParams(state="MG"))
    assert len(mg_df) > 0
    assert (mg_df["state"] == "Minas Gerais").all()

    # Filter by date range (February 2023)
    feb_df = apply_filters(
        sales_df,
        DashboardFilterParams(start_date="2023-02-01", end_date="2023-02-28"),
    )
    assert len(feb_df) == 24

    # Filter by ad_sale
    ads_only = apply_filters(sales_df, DashboardFilterParams(ad_sale=True))
    assert bool(ads_only["is_ad_sale"].all()) is True

    # Filter by search (order_id)
    search_df = apply_filters(sales_df, DashboardFilterParams(search="2000004826452531"))
    assert len(search_df) == 1
    assert search_df.iloc[0]["sku"] == "PEANUT-CHOCOTINE-600G"


def test_available_filters_and_paginated_orders(sales_df: pd.DataFrame) -> None:
    """Verify filter metadata extraction and order table pagination/sorting."""
    filters = get_available_filters(sales_df)
    assert filters.min_date == "2023-01-24"
    assert filters.max_date == "2023-09-13"
    assert len(filters.states) == 13
    assert len(filters.skus) == 15
    assert len(filters.listings) == 10
    assert len(filters.statuses) == 3

    page1 = get_paginated_orders(
        sales_df,
        DashboardFilterParams(),
        page=1,
        page_size=10,
        sort_by="net_revenue",
        sort_dir="desc",
    )
    assert page1.total == 99
    assert page1.total_pages == 10
    assert len(page1.items) == 10
    assert page1.items[0].net_revenue >= page1.items[-1].net_revenue

    # Empty filter result handles zero division gracefully
    empty_dashboard = build_dashboard_response(
        sales_df, DashboardFilterParams(search="NON_EXISTENT_ORDER_999999")
    )
    assert empty_dashboard.kpis.total_orders == 0
    assert empty_dashboard.kpis.net_revenue == 0.0
    assert empty_dashboard.kpis.average_ticket == 0.0
