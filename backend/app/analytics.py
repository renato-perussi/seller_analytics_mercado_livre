"""Pure analytical engine for Mercado Livre sales filtering, KPIs, and chart aggregations."""

from __future__ import annotations

import math
from typing import Literal

import pandas as pd

from backend.app.schemas import (
    AdsBreakdownItem,
    DashboardFilterParams,
    DashboardKPIs,
    DashboardResponse,
    FiltersResponse,
    FinancialBreakdownStep,
    ListingFilterOption,
    ListingRankingItem,
    OrderRecord,
    OrdersResponse,
    SkuFilterOption,
    SkuRankingItem,
    StateBreakdownItem,
    StatusBreakdownItem,
    TimeSeriesPoint,
)

PT_BR_MONTH_ABBR: dict[int, str] = {
    1: "Jan",
    2: "Fev",
    3: "Mar",
    4: "Abr",
    5: "Mai",
    6: "Jun",
    7: "Jul",
    8: "Ago",
    9: "Set",
    10: "Out",
    11: "Nov",
    12: "Dez",
}

SORTABLE_ORDER_COLUMNS: set[str] = {
    "order_id",
    "sale_date",
    "status",
    "units",
    "product_revenue",
    "shipping_revenue",
    "sale_fee",
    "shipping_fee",
    "cancellation_amount",
    "net_revenue",
    "total_brl",
    "sku",
    "listing_id",
    "listing_title",
    "flavor",
    "unit_price",
    "customer_id",
    "state",
    "dispatch_days",
    "delivery_days",
    "transit_days",
}


def get_available_filters(
    df: pd.DataFrame, active_source: str = "sales_2023.csv"
) -> FiltersResponse:
    """Extract dynamic filter options and date bounds from the active dataset."""
    if df.empty:
        return FiltersResponse(
            min_date="",
            max_date="",
            states=[],
            skus=[],
            listings=[],
            statuses=[],
            sku_options=[],
            listing_options=[],
            active_source=active_source,
            total_rows=0,
        )

    min_date = df["sale_date"].min().strftime("%Y-%m-%d")
    max_date = df["sale_date"].max().strftime("%Y-%m-%d")
    states = sorted(df["state"].dropna().unique().tolist())
    skus = sorted(df["sku"].dropna().unique().tolist())
    listings = sorted(df["listing_id"].dropna().unique().tolist())

    preferred_status_order = [
        "Entregue",
        "Mediação finalizada. Te demos o dinheiro",
        "Cancelada pelo comprador",
    ]
    raw_statuses = df["status"].dropna().unique().tolist()
    statuses = [s for s in preferred_status_order if s in raw_statuses] + sorted(
        s for s in raw_statuses if s not in preferred_status_order
    )

    sku_options: list[SkuFilterOption] = []
    for sku_val in skus:
        sub = df[df["sku"] == sku_val].iloc[0]
        sku_options.append(
            SkuFilterOption(
                sku=sku_val,
                listing_id=str(sub["listing_id"]),
                title=str(sub["listing_title"]),
                flavor=str(sub["flavor"]),
            )
        )

    listing_options: list[ListingFilterOption] = []
    for listing_val in listings:
        sub_df = df[df["listing_id"] == listing_val]
        listing_options.append(
            ListingFilterOption(
                listing_id=listing_val,
                title=str(sub_df["listing_title"].iloc[0]),
                sku_count=int(sub_df["sku"].nunique()),
            )
        )

    return FiltersResponse(
        min_date=min_date,
        max_date=max_date,
        states=states,
        skus=skus,
        listings=listings,
        statuses=statuses,
        sku_options=sku_options,
        listing_options=listing_options,
        active_source=active_source,
        total_rows=int(len(df)),
    )


def apply_filters(df: pd.DataFrame, params: DashboardFilterParams) -> pd.DataFrame:
    """Filter the normalized sales DataFrame according to query parameters."""
    if df.empty:
        return df.copy()

    mask = pd.Series(True, index=df.index)

    if params.start_date and params.start_date.strip():
        start_dt = pd.to_datetime(params.start_date.strip(), errors="coerce")
        if pd.notna(start_dt):
            mask &= df["sale_date"].dt.date >= start_dt.date()

    if params.end_date and params.end_date.strip():
        end_dt = pd.to_datetime(params.end_date.strip(), errors="coerce")
        if pd.notna(end_dt):
            mask &= df["sale_date"].dt.date <= end_dt.date()

    if params.state and params.state.strip().lower() not in {"", "all", "todos", "todas"}:
        state_val = params.state.strip().lower()
        mask &= (df["state"].str.lower() == state_val) | (df["state_code"].str.lower() == state_val)

    if params.sku and params.sku.strip().lower() not in {"", "all", "todos", "todas"}:
        sku_val = params.sku.strip().lower()
        mask &= df["sku"].str.lower() == sku_val

    if params.listing_id and params.listing_id.strip().lower() not in {
        "",
        "all",
        "todos",
        "todas",
    }:
        listing_val = params.listing_id.strip().lower()
        mask &= df["listing_id"].str.lower() == listing_val

    if params.status and params.status.strip().lower() not in {"", "all", "todos", "todas"}:
        status_val = params.status.strip().lower()
        mask &= df["status"].str.lower() == status_val

    if params.ad_sale is not None:
        mask &= df["is_ad_sale"] == params.ad_sale

    if params.search and params.search.strip():
        query = params.search.strip().lower()
        search_mask = (
            df["order_id"].str.lower().str.contains(query, na=False, regex=False)
            | df["customer_id"].str.lower().str.contains(query, na=False, regex=False)
            | df["sku"].str.lower().str.contains(query, na=False, regex=False)
            | df["listing_id"].str.lower().str.contains(query, na=False, regex=False)
            | df["listing_title"].str.lower().str.contains(query, na=False, regex=False)
            | df["flavor"].str.lower().str.contains(query, na=False, regex=False)
            | df["state"].str.lower().str.contains(query, na=False, regex=False)
        )
        mask &= search_mask

    return df.loc[mask].copy()


def compute_kpis(df: pd.DataFrame) -> DashboardKPIs:
    """Compute executive KPI metrics from a filtered DataFrame."""
    total_orders = int(len(df))
    if total_orders == 0:
        return DashboardKPIs(
            net_revenue=0.0,
            gross_revenue=0.0,
            gross_product_revenue_all=0.0,
            shipping_revenue=0.0,
            sale_fees=0.0,
            shipping_fees=0.0,
            net_shipping_cost=0.0,
            total_fees=0.0,
            fee_burden_pct=0.0,
            net_margin_pct=0.0,
            total_orders=0,
            realized_orders=0,
            canceled_orders=0,
            cancellation_amount=0.0,
            cancellation_rate_pct=0.0,
            mediation_orders=0,
            units_sold=0,
            average_ticket=0.0,
            gross_average_ticket=0.0,
            avg_delivery_days=0.0,
            avg_dispatch_days=0.0,
            avg_transit_days=0.0,
            ad_sales_share_pct=0.0,
        )

    realized_df = df[df["is_realized"]]
    canceled_df = df[df["is_canceled"]]

    realized_orders = int(len(realized_df))
    canceled_orders = int(len(canceled_df))
    mediation_orders = int(df["is_mediation"].sum())

    net_revenue = round(float(df["net_revenue"].sum()), 2)
    gross_revenue = round(float(realized_df["product_revenue"].sum()), 2)
    gross_product_revenue_all = round(float(df["product_revenue"].sum()), 2)
    shipping_revenue = round(float(realized_df["shipping_revenue"].sum()), 2)
    sale_fees = round(float(realized_df["sale_fee"].sum()), 2)
    shipping_fees = round(float(realized_df["shipping_fee"].sum()), 2)
    net_shipping_cost = round(shipping_fees - shipping_revenue, 2)
    total_fees = round(sale_fees + shipping_fees, 2)
    cancellation_amount = round(float(df["cancellation_amount"].sum()), 2)

    gross_plus_shipping = round(gross_revenue + shipping_revenue, 2)
    fee_burden_pct = (
        round((total_fees / gross_plus_shipping) * 100.0, 2) if gross_plus_shipping > 0 else 0.0
    )
    net_margin_pct = round((net_revenue / gross_revenue) * 100.0, 2) if gross_revenue > 0 else 0.0
    cancellation_rate_pct = (
        round((canceled_orders / total_orders) * 100.0, 2) if total_orders > 0 else 0.0
    )

    units_sold = int(realized_df["units"].sum()) if realized_orders > 0 else 0
    average_ticket = round(net_revenue / realized_orders, 2) if realized_orders > 0 else 0.0
    gross_average_ticket = round(gross_revenue / realized_orders, 2) if realized_orders > 0 else 0.0

    valid_delivery = realized_df["delivery_days"].dropna()
    valid_dispatch = realized_df["dispatch_days"].dropna()
    valid_transit = realized_df["transit_days"].dropna()

    avg_delivery_days = round(float(valid_delivery.mean()), 2) if len(valid_delivery) > 0 else 0.0
    avg_dispatch_days = round(float(valid_dispatch.mean()), 2) if len(valid_dispatch) > 0 else 0.0
    avg_transit_days = round(float(valid_transit.mean()), 2) if len(valid_transit) > 0 else 0.0

    ad_realized_orders = int(realized_df["is_ad_sale"].sum()) if realized_orders > 0 else 0
    ad_sales_share_pct = (
        round((ad_realized_orders / realized_orders) * 100.0, 2) if realized_orders > 0 else 0.0
    )

    return DashboardKPIs(
        net_revenue=net_revenue,
        gross_revenue=gross_revenue,
        gross_product_revenue_all=gross_product_revenue_all,
        shipping_revenue=shipping_revenue,
        sale_fees=sale_fees,
        shipping_fees=shipping_fees,
        net_shipping_cost=net_shipping_cost,
        total_fees=total_fees,
        fee_burden_pct=fee_burden_pct,
        net_margin_pct=net_margin_pct,
        total_orders=total_orders,
        realized_orders=realized_orders,
        canceled_orders=canceled_orders,
        cancellation_amount=cancellation_amount,
        cancellation_rate_pct=cancellation_rate_pct,
        mediation_orders=mediation_orders,
        units_sold=units_sold,
        average_ticket=average_ticket,
        gross_average_ticket=gross_average_ticket,
        avg_delivery_days=avg_delivery_days,
        avg_dispatch_days=avg_dispatch_days,
        avg_transit_days=avg_transit_days,
        ad_sales_share_pct=ad_sales_share_pct,
    )


def compute_time_series(
    df: pd.DataFrame, granularity: Literal["month", "week", "day"] = "month"
) -> list[TimeSeriesPoint]:
    """Compute time series points grouped by month, week, or day."""
    if df.empty:
        return []

    work_df = df.sort_values("sale_date").copy()
    if granularity == "month":
        work_df["_period_key"] = work_df["sale_date"].dt.to_period("M")
    elif granularity == "week":
        work_df["_period_key"] = work_df["sale_date"].dt.to_period("W-SUN")
    else:
        work_df["_period_key"] = work_df["sale_date"].dt.to_period("D")

    points: list[TimeSeriesPoint] = []
    for period_obj, group in work_df.groupby("_period_key", sort=True):
        realized_group = group[group["is_realized"]]
        if granularity == "month":
            period_str = f"{period_obj.year:04d}-{period_obj.month:02d}"
            label_str = f"{PT_BR_MONTH_ABBR[period_obj.month]}/{str(period_obj.year)[-2:]}"
        elif granularity == "week":
            start_dt = period_obj.start_time
            end_dt = period_obj.end_time
            period_str = start_dt.strftime("%Y-%m-%d")
            label_str = f"{start_dt.strftime('%d/%m')} a {end_dt.strftime('%d/%m')}"
        else:
            start_dt = period_obj.start_time
            period_str = start_dt.strftime("%Y-%m-%d")
            label_str = start_dt.strftime("%d/%m/%Y")

        points.append(
            TimeSeriesPoint(
                period=period_str,
                label=label_str,
                gross_revenue=round(float(realized_group["product_revenue"].sum()), 2),
                net_revenue=round(float(group["net_revenue"].sum()), 2),
                sale_fees=round(float(realized_group["sale_fee"].sum()), 2),
                shipping_fees=round(float(realized_group["shipping_fee"].sum()), 2),
                shipping_revenue=round(float(realized_group["shipping_revenue"].sum()), 2),
                orders=int(len(group)),
                realized_orders=int(len(realized_group)),
                canceled_orders=int(group["is_canceled"].sum()),
                units=int(realized_group["units"].sum()),
            )
        )
    return points


def compute_financial_breakdown(df: pd.DataFrame) -> list[FinancialBreakdownStep]:
    """Compute waterfall financial breakdown reconciling Gross to Net Revenue to the exact cent."""
    gross_prod = round(float(df["product_revenue"].sum()), 2) if not df.empty else 0.0
    ship_rev = round(float(df["shipping_revenue"].sum()), 2) if not df.empty else 0.0
    sale_fee_ded = round(float(df["sale_fee_deduction"].sum()), 2) if not df.empty else 0.0
    ship_fee_ded = round(float(df["shipping_fee_deduction"].sum()), 2) if not df.empty else 0.0
    cancel_ded = round(float(df["cancellation_deduction"].sum()), 2) if not df.empty else 0.0
    net_rev = round(float(df["net_revenue"].sum()), 2) if not df.empty else 0.0

    total_inflow = round(gross_prod + ship_rev, 2)

    raw_steps: list[tuple[str, str, Literal["credit", "debit", "total"], float]] = [
        ("gross_product_revenue", "Receita de Produtos", "credit", gross_prod),
        ("shipping_revenue", "Receita de Envio", "credit", ship_rev),
        ("sale_fees", "Tarifas de Venda", "debit", sale_fee_ded),
        ("shipping_fees", "Tarifas de Envio", "debit", ship_fee_ded),
        ("cancellations", "Cancelamentos e Reembolsos", "debit", cancel_ded),
        ("net_revenue", "Receita Líquida (Total)", "total", net_rev),
    ]

    steps: list[FinancialBreakdownStep] = []
    running = 0.0
    for key, label, step_type, val in raw_steps:
        if step_type == "total":
            running = net_rev
        else:
            running = round(running + val, 2)

        abs_val = round(abs(val), 2)
        share_pct = round((abs_val / total_inflow) * 100.0, 2) if total_inflow > 0 else 0.0
        steps.append(
            FinancialBreakdownStep(
                key=key,
                label=label,
                type=step_type,
                value=val,
                abs_value=abs_val,
                running_total=running,
                share_of_gross_pct=share_pct,
            )
        )
    return steps


def compute_sku_ranking(df: pd.DataFrame) -> list[SkuRankingItem]:
    """Compute product ranking aggregated by SKU."""
    if df.empty:
        return []

    total_net_revenue = round(float(df["net_revenue"].sum()), 2)
    items: list[SkuRankingItem] = []

    for sku_val, group in df.groupby("sku", sort=False):
        realized = group[group["is_realized"]]
        first_row = group.iloc[0]

        orders = int(len(realized))
        total_orders = int(len(group))
        canceled_orders = int(group["is_canceled"].sum())
        units = int(realized["units"].sum())
        gross_rev = round(float(realized["product_revenue"].sum()), 2)
        net_rev = round(float(group["net_revenue"].sum()), 2)
        sale_fees = round(float(realized["sale_fee"].sum()), 2)
        shipping_fees = round(float(realized["shipping_fee"].sum()), 2)

        net_margin_pct = round((net_rev / gross_rev) * 100.0, 2) if gross_rev > 0 else 0.0
        avg_price = (
            round(gross_rev / units, 2)
            if units > 0
            else round(float(group["unit_price"].mean()), 2)
        )
        share_rev_pct = (
            round((net_rev / total_net_revenue) * 100.0, 2) if total_net_revenue > 0 else 0.0
        )

        items.append(
            SkuRankingItem(
                sku=str(sku_val),
                listing_id=str(first_row["listing_id"]),
                title=str(first_row["listing_title"]),
                flavor=str(first_row["flavor"]),
                orders=orders,
                total_orders=total_orders,
                canceled_orders=canceled_orders,
                units=units,
                gross_revenue=gross_rev,
                net_revenue=net_rev,
                sale_fees=sale_fees,
                shipping_fees=shipping_fees,
                net_margin_pct=net_margin_pct,
                average_price=avg_price,
                share_revenue_pct=share_rev_pct,
            )
        )

    items.sort(key=lambda x: (-x.net_revenue, -x.units, x.sku))
    return items


def compute_listing_ranking(df: pd.DataFrame) -> list[ListingRankingItem]:
    """Compute listing performance ranking aggregated by # de anúncio (MLB ID)."""
    if df.empty:
        return []

    total_net_revenue = round(float(df["net_revenue"].sum()), 2)
    items: list[ListingRankingItem] = []

    for listing_val, group in df.groupby("listing_id", sort=False):
        realized = group[group["is_realized"]]
        first_row = group.iloc[0]
        skus_list = sorted(group["sku"].unique().tolist())

        orders = int(len(realized))
        total_orders = int(len(group))
        canceled_orders = int(group["is_canceled"].sum())
        units = int(realized["units"].sum())
        gross_rev = round(float(realized["product_revenue"].sum()), 2)
        net_rev = round(float(group["net_revenue"].sum()), 2)
        sale_fees = round(float(realized["sale_fee"].sum()), 2)
        shipping_fees = round(float(realized["shipping_fee"].sum()), 2)

        net_margin_pct = round((net_rev / gross_rev) * 100.0, 2) if gross_rev > 0 else 0.0
        share_rev_pct = (
            round((net_rev / total_net_revenue) * 100.0, 2) if total_net_revenue > 0 else 0.0
        )

        items.append(
            ListingRankingItem(
                listing_id=str(listing_val),
                title=str(first_row["listing_title"]),
                sku_count=len(skus_list),
                skus=skus_list,
                orders=orders,
                total_orders=total_orders,
                canceled_orders=canceled_orders,
                units=units,
                gross_revenue=gross_rev,
                net_revenue=net_rev,
                sale_fees=sale_fees,
                shipping_fees=shipping_fees,
                net_margin_pct=net_margin_pct,
                share_revenue_pct=share_rev_pct,
            )
        )

    items.sort(key=lambda x: (-x.net_revenue, -x.units, x.listing_id))
    return items


def compute_state_breakdown(df: pd.DataFrame) -> list[StateBreakdownItem]:
    """Compute geographic revenue and logistics metrics grouped by state (UF)."""
    if df.empty:
        return []

    total_net_revenue = round(float(df["net_revenue"].sum()), 2)
    items: list[StateBreakdownItem] = []

    for state_val, group in df.groupby("state", sort=False):
        realized = group[group["is_realized"]]
        state_code = str(group["state_code"].iloc[0])

        orders = int(len(realized))
        total_orders = int(len(group))
        canceled_orders = int(group["is_canceled"].sum())
        units = int(realized["units"].sum())
        gross_rev = round(float(realized["product_revenue"].sum()), 2)
        net_rev = round(float(group["net_revenue"].sum()), 2)
        share_pct = (
            round((net_rev / total_net_revenue) * 100.0, 2) if total_net_revenue > 0 else 0.0
        )

        valid_deliv = realized["delivery_days"].dropna()
        valid_disp = realized["dispatch_days"].dropna()
        avg_deliv = round(float(valid_deliv.mean()), 2) if len(valid_deliv) > 0 else 0.0
        avg_disp = round(float(valid_disp.mean()), 2) if len(valid_disp) > 0 else 0.0
        avg_ship_fee = (
            round(float(realized["shipping_fee"].mean()), 2) if len(realized) > 0 else 0.0
        )

        items.append(
            StateBreakdownItem(
                state=str(state_val),
                state_code=state_code,
                orders=orders,
                total_orders=total_orders,
                canceled_orders=canceled_orders,
                units=units,
                gross_revenue=gross_rev,
                net_revenue=net_rev,
                share_pct=share_pct,
                avg_delivery_days=avg_deliv,
                avg_dispatch_days=avg_disp,
                avg_shipping_fee=avg_ship_fee,
            )
        )

    items.sort(key=lambda x: (-x.net_revenue, -x.orders, x.state))
    return items


def compute_ads_breakdown(df: pd.DataFrame) -> list[AdsBreakdownItem]:
    """Compare performance between Mercado Ads sales and Organic sales."""
    total_net_revenue = round(float(df["net_revenue"].sum()), 2) if not df.empty else 0.0
    total_realized_orders = int(df["is_realized"].sum()) if not df.empty else 0

    segments: list[tuple[bool, str]] = [
        (True, "Com Publicidade (Ads)"),
        (False, "Orgânico"),
    ]
    items: list[AdsBreakdownItem] = []

    for is_ad, label in segments:
        if df.empty:
            group = df
            realized = df
        else:
            group = df[df["is_ad_sale"] == is_ad]
            realized = group[group["is_realized"]]

        orders = int(len(realized))
        total_orders = int(len(group))
        canceled_orders = int(group["is_canceled"].sum()) if not group.empty else 0
        units = int(realized["units"].sum()) if not realized.empty else 0
        gross_rev = (
            round(float(realized["product_revenue"].sum()), 2) if not realized.empty else 0.0
        )
        net_rev = round(float(group["net_revenue"].sum()), 2) if not group.empty else 0.0
        sale_fees = round(float(realized["sale_fee"].sum()), 2) if not realized.empty else 0.0
        shipping_fees = (
            round(float(realized["shipping_fee"].sum()), 2) if not realized.empty else 0.0
        )

        avg_ticket = round(net_rev / orders, 2) if orders > 0 else 0.0
        gross_avg_ticket = round(gross_rev / orders, 2) if orders > 0 else 0.0
        net_margin_pct = round((net_rev / gross_rev) * 100.0, 2) if gross_rev > 0 else 0.0
        share_rev_pct = (
            round((net_rev / total_net_revenue) * 100.0, 2) if total_net_revenue > 0 else 0.0
        )
        share_orders_pct = (
            round((orders / total_realized_orders) * 100.0, 2) if total_realized_orders > 0 else 0.0
        )

        items.append(
            AdsBreakdownItem(
                segment=label,
                is_ad_sale=is_ad,
                orders=orders,
                total_orders=total_orders,
                canceled_orders=canceled_orders,
                units=units,
                gross_revenue=gross_rev,
                net_revenue=net_rev,
                sale_fees=sale_fees,
                shipping_fees=shipping_fees,
                average_ticket=avg_ticket,
                gross_average_ticket=gross_avg_ticket,
                net_margin_pct=net_margin_pct,
                share_revenue_pct=share_rev_pct,
                share_orders_pct=share_orders_pct,
            )
        )

    return items


def compute_status_breakdown(df: pd.DataFrame) -> list[StatusBreakdownItem]:
    """Compute order and revenue breakdown by order status."""
    if df.empty:
        return []

    total_orders = int(len(df))
    items: list[StatusBreakdownItem] = []

    for status_val, group in df.groupby("status", sort=False):
        orders = int(len(group))
        units = int(group["units"].sum())
        gross_prod_rev = round(float(group["product_revenue"].sum()), 2)
        net_rev = round(float(group["net_revenue"].sum()), 2)
        share_orders_pct = round((orders / total_orders) * 100.0, 2) if total_orders > 0 else 0.0

        items.append(
            StatusBreakdownItem(
                status=str(status_val),
                orders=orders,
                units=units,
                gross_product_revenue=gross_prod_rev,
                net_revenue=net_rev,
                share_orders_pct=share_orders_pct,
            )
        )

    items.sort(key=lambda x: (-x.orders, x.status))
    return items


def build_dashboard_response(
    df: pd.DataFrame,
    params: DashboardFilterParams,
    active_source: str = "sales_2023.csv",
) -> DashboardResponse:
    """Apply filters and compute the complete DashboardResponse payload."""
    filtered_df = apply_filters(df, params)
    return DashboardResponse(
        kpis=compute_kpis(filtered_df),
        time_series=compute_time_series(filtered_df, granularity=params.granularity),
        weekly_time_series=compute_time_series(filtered_df, granularity="week"),
        financial_breakdown=compute_financial_breakdown(filtered_df),
        sku_ranking=compute_sku_ranking(filtered_df),
        listing_ranking=compute_listing_ranking(filtered_df),
        state_breakdown=compute_state_breakdown(filtered_df),
        ads_breakdown=compute_ads_breakdown(filtered_df),
        status_breakdown=compute_status_breakdown(filtered_df),
        active_source=active_source,
    )


def _row_to_order_record(row: pd.Series) -> OrderRecord:
    """Convert a normalized DataFrame row into an OrderRecord schema instance."""
    dispatch_val = None if pd.isna(row["dispatch_days"]) else round(float(row["dispatch_days"]), 2)
    delivery_val = None if pd.isna(row["delivery_days"]) else round(float(row["delivery_days"]), 2)
    transit_val = None if pd.isna(row["transit_days"]) else round(float(row["transit_days"]), 2)

    sale_ts: pd.Timestamp = row["sale_date"]
    shipped_ts: pd.Timestamp = row["shipped_date"]
    delivered_ts: pd.Timestamp = row["delivered_date"]

    return OrderRecord(
        order_id=str(row["order_id"]),
        sale_date=sale_ts.strftime("%Y-%m-%d %H:%M:%S"),
        sale_date_br=sale_ts.strftime("%d/%m/%Y %H:%M"),
        status=str(row["status"]),
        status_description=str(row["status_description"]),
        is_realized=bool(row["is_realized"]),
        is_canceled=bool(row["is_canceled"]),
        is_mediation=bool(row["is_mediation"]),
        is_bundle=bool(row["is_bundle"]),
        units=int(row["units"]),
        product_revenue=round(float(row["product_revenue"]), 2),
        shipping_revenue=round(float(row["shipping_revenue"]), 2),
        sale_fee=round(float(row["sale_fee"]), 2),
        sale_fee_deduction=round(float(row["sale_fee_deduction"]), 2),
        shipping_fee=round(float(row["shipping_fee"]), 2),
        shipping_fee_deduction=round(float(row["shipping_fee_deduction"]), 2),
        cancellation_amount=round(float(row["cancellation_amount"]), 2),
        cancellation_deduction=round(float(row["cancellation_deduction"]), 2),
        net_revenue=round(float(row["net_revenue"]), 2),
        total_brl=round(float(row["total_brl"]), 2),
        is_ad_sale=bool(row["is_ad_sale"]),
        sku=str(row["sku"]),
        listing_id=str(row["listing_id"]),
        listing_title=str(row["listing_title"]),
        variation=str(row["variation"]),
        flavor=str(row["flavor"]),
        unit_price=round(float(row["unit_price"]), 2),
        listing_type=str(row["listing_type"]),
        customer_id=str(row["customer_id"]),
        state=str(row["state"]),
        state_code=str(row["state_code"]),
        country=str(row["country"]),
        delivery_method=str(row["delivery_method"]),
        shipped_date=shipped_ts.strftime("%Y-%m-%d %H:%M:%S"),
        delivered_date=delivered_ts.strftime("%Y-%m-%d %H:%M:%S"),
        dispatch_days=dispatch_val,
        delivery_days=delivery_val,
        transit_days=transit_val,
        has_open_claim=bool(row["has_open_claim"]),
        has_closed_claim=bool(row["has_closed_claim"]),
        in_mediation=bool(row["in_mediation"]),
    )


def get_paginated_orders(
    df: pd.DataFrame,
    params: DashboardFilterParams,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "sale_date",
    sort_dir: Literal["asc", "desc"] = "desc",
) -> OrdersResponse:
    """Filter, sort, and paginate individual order records."""
    filtered_df = apply_filters(df, params)
    total = int(len(filtered_df))

    safe_page = max(1, page)
    safe_page_size = max(1, min(page_size, 200))
    total_pages = max(1, math.ceil(total / safe_page_size)) if total > 0 else 1

    valid_sort_col = sort_by if sort_by in SORTABLE_ORDER_COLUMNS else "sale_date"
    ascending = sort_dir == "asc"

    if not filtered_df.empty:
        sorted_df = filtered_df.sort_values(
            by=valid_sort_col,
            ascending=ascending,
            na_position="last",
            kind="mergesort",
        )
        start_idx = (safe_page - 1) * safe_page_size
        end_idx = start_idx + safe_page_size
        page_df = sorted_df.iloc[start_idx:end_idx]
        items = [_row_to_order_record(row) for _, row in page_df.iterrows()]
    else:
        items = []

    return OrdersResponse(
        items=items,
        total=total,
        total_count=total,
        page=safe_page,
        page_size=safe_page_size,
        total_pages=total_pages,
        sort_by=valid_sort_col,
        sort_dir=sort_dir,
    )
