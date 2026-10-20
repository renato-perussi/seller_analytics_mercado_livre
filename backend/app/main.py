"""FastAPI application entry point for the Mercado Livre Sales Analytics Dashboard."""

from __future__ import annotations

import logging
import os
from typing import Literal

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.app.analytics import (
    build_dashboard_response,
    get_available_filters,
    get_paginated_orders,
)
from backend.app.data_loader import (
    MAX_CSV_SIZE_BYTES,
    CSVValidationError,
    dataset_store,
)
from backend.app.schemas import (
    DashboardFilterParams,
    DashboardResponse,
    DatasetMutationResponse,
    FiltersResponse,
    HealthResponse,
    OrdersResponse,
)

logger = logging.getLogger("mercado_livre_dashboard")

app = FastAPI(
    title="Mercado Livre Sales Analytics API",
    description="Analytical backend for Mercado Livre sales performance and KPI tracking.",
    version="1.0.0",
)

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
_raw_cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [origin.strip() for origin in _raw_cors_origins.split(",") if origin.strip()]
    if _raw_cors_origins.strip()
    else DEFAULT_CORS_ORIGINS
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _parse_ad_sale_param(value: str | bool | None) -> bool | None:
    """Parse flexible boolean query parameter representations for ad_sale filtering."""
    if value is None or isinstance(value, bool):
        return value
    cleaned = value.strip().lower()
    if cleaned in {"", "all", "todos", "todas", "null", "none"}:
        return None
    if cleaned in {"true", "1", "sim", "yes", "ads"}:
        return True
    if cleaned in {"false", "0", "não", "nao", "no", "organic", "organico"}:
        return False
    raise HTTPException(
        status_code=400,
        detail=f"Invalid 'ad_sale' query parameter: {value!r}. Expected true or false.",
    )


def _validate_date_param(date_str: str | None, field_name: str) -> str | None:
    """Validate optional ISO date strings (YYYY-MM-DD)."""
    if date_str is None or not date_str.strip():
        return None
    cleaned = date_str.strip()
    parsed = pd.to_datetime(cleaned, format="%Y-%m-%d", errors="coerce")
    if pd.isna(parsed):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid '{field_name}' format: {date_str!r}. Expected YYYY-MM-DD.",
        )
    return cleaned


def _build_filter_params(
    start_date: str | None,
    end_date: str | None,
    state: str | None,
    sku: str | None,
    listing_id: str | None,
    status: str | None,
    ad_sale: str | bool | None,
    search: str | None,
    granularity: Literal["month", "week", "day"] = "month",
) -> DashboardFilterParams:
    """Validate and construct a DashboardFilterParams object from raw query inputs."""
    valid_start = _validate_date_param(start_date, "start_date")
    valid_end = _validate_date_param(end_date, "end_date")
    if valid_start and valid_end and valid_start > valid_end:
        raise HTTPException(
            status_code=400,
            detail="Parameter 'start_date' cannot be later than 'end_date'.",
        )

    return DashboardFilterParams(
        start_date=valid_start,
        end_date=valid_end,
        state=state,
        sku=sku,
        listing_id=listing_id,
        status=status,
        ad_sale=_parse_ad_sale_param(ad_sale),
        search=search,
        granularity=granularity,
    )


@app.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return service health status and active dataset metadata."""
    df = dataset_store.get_dataframe()
    return HealthResponse(
        status="ok",
        dataset_rows=len(df),
        active_source=dataset_store.get_active_source(),
    )


@app.get("/api/filters", response_model=FiltersResponse)
def get_filters() -> FiltersResponse:
    """Return available filter values and date bounds for the active dataset."""
    df = dataset_store.get_dataframe()
    return get_available_filters(df, active_source=dataset_store.get_active_source())


@app.get("/api/dashboard", response_model=DashboardResponse)
def get_dashboard(
    start_date: str | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(default=None, description="End date (YYYY-MM-DD)"),
    state: str | None = Query(default=None, description="State name or UF code"),
    sku: str | None = Query(default=None, description="Product SKU"),
    listing_id: str | None = Query(default=None, description="Mercado Livre listing ID"),
    status: str | None = Query(default=None, description="Order status"),
    ad_sale: str | None = Query(default=None, description="Filter by ad sale (true/false)"),
    search: str | None = Query(
        default=None,
        description="Search across order_id, customer_id, sku, listing_id, listing_title",
    ),
    granularity: Literal["month", "week", "day"] = Query(
        default="month", description="Time series aggregation granularity"
    ),
) -> DashboardResponse:
    """Compute and return all executive KPIs and analytical breakdowns."""
    params = _build_filter_params(
        start_date=start_date,
        end_date=end_date,
        state=state,
        sku=sku,
        listing_id=listing_id,
        status=status,
        ad_sale=ad_sale,
        search=search,
        granularity=granularity,
    )
    df = dataset_store.get_dataframe()
    return build_dashboard_response(
        df=df,
        params=params,
        active_source=dataset_store.get_active_source(),
    )


@app.get("/api/orders", response_model=OrdersResponse)
def get_orders(
    start_date: str | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(default=None, description="End date (YYYY-MM-DD)"),
    state: str | None = Query(default=None, description="State name or UF code"),
    sku: str | None = Query(default=None, description="Product SKU"),
    listing_id: str | None = Query(default=None, description="Mercado Livre listing ID"),
    status: str | None = Query(default=None, description="Order status"),
    ad_sale: str | None = Query(default=None, description="Filter by ad sale (true/false)"),
    search: str | None = Query(
        default=None,
        description="Search across order_id, customer_id, sku, listing_id, listing_title",
    ),
    page: int = Query(default=1, ge=1, description="1-based page number"),
    page_size: int = Query(default=20, ge=1, le=200, description="Items per page"),
    sort_by: str = Query(default="sale_date", description="Column to sort by"),
    sort_dir: Literal["asc", "desc"] = Query(default="desc", description="Sort direction"),
) -> OrdersResponse:
    """Return a filtered, sorted, and paginated list of individual order records."""
    params = _build_filter_params(
        start_date=start_date,
        end_date=end_date,
        state=state,
        sku=sku,
        listing_id=listing_id,
        status=status,
        ad_sale=ad_sale,
        search=search,
    )
    df = dataset_store.get_dataframe()
    return get_paginated_orders(
        df=df,
        params=params,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )


@app.post("/api/upload", response_model=DatasetMutationResponse)
async def upload_dataset(file: UploadFile = File(...)) -> DatasetMutationResponse:  # noqa: B008
    """Validate and load a user-uploaded Mercado Livre sales CSV into memory."""
    filename = file.filename or "uploaded.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file extension. Only .csv files are accepted.",
        )

    content = await file.read(MAX_CSV_SIZE_BYTES + 1)
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded CSV file is empty.")
    if len(content) > MAX_CSV_SIZE_BYTES:
        max_mb = MAX_CSV_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"CSV file exceeds maximum size limit of {max_mb} MB.",
        )

    try:
        updated_df = dataset_store.update_from_bytes(content=content, filename=filename)
    except CSVValidationError as exc:
        logger.warning("Rejected invalid CSV upload '%s': %s", filename, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    active_source = dataset_store.get_active_source()
    return DatasetMutationResponse(
        status="ok",
        message=f"Dataset '{active_source}' loaded successfully with {len(updated_df)} orders.",
        active_source=active_source,
        dataset_rows=len(updated_df),
    )


@app.post("/api/reset-dataset", response_model=DatasetMutationResponse)
@app.post("/api/reset", response_model=DatasetMutationResponse)
def reset_dataset() -> DatasetMutationResponse:
    """Reset the active in-memory dataset back to data/sales_2023.csv."""
    default_df = dataset_store.reset_to_default()
    active_source = dataset_store.get_active_source()
    return DatasetMutationResponse(
        status="ok",
        message=f"Dataset restored to default '{active_source}' ({len(default_df)} orders).",
        active_source=active_source,
        dataset_rows=len(default_df),
    )
