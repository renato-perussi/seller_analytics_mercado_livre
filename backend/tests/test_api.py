"""Integration tests for the FastAPI REST endpoints."""

from __future__ import annotations

import io
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from backend.app.data_loader import DEFAULT_CSV_PATH, dataset_store
from backend.app.main import app


@pytest.fixture(autouse=True)
def reset_store_between_tests() -> Generator[None, None, None]:
    """Ensure the active dataset is always reset to sales_2023.csv before and after each test."""
    dataset_store.reset_to_default()
    yield
    dataset_store.reset_to_default()


@pytest.fixture()
def client() -> TestClient:
    """Create a FastAPI TestClient instance."""
    return TestClient(app)


def test_health_endpoint(client: TestClient) -> None:
    """Verify GET /api/health returns dataset status and row count."""
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "status": "ok",
        "dataset_rows": 99,
        "active_source": "sales_2023.csv",
    }


def test_filters_endpoint(client: TestClient) -> None:
    """Verify GET /api/filters returns all available filter dimensions."""
    response = client.get("/api/filters")
    assert response.status_code == 200
    data = response.json()

    assert data["min_date"] == "2023-01-24"
    assert data["max_date"] == "2023-09-13"
    assert data["active_source"] == "sales_2023.csv"
    assert data["total_rows"] == 99
    assert len(data["states"]) == 13
    assert "São Paulo" in data["states"]
    assert len(data["skus"]) == 15
    assert "PEANUT-CHOCOTINE-600G" in data["skus"]
    assert len(data["listings"]) == 10
    assert "MLB2787409678" in data["listings"]
    assert len(data["statuses"]) == 3


def test_dashboard_endpoint_unfiltered_and_filtered(client: TestClient) -> None:
    """Verify GET /api/dashboard returns full KPIs and chart series with exact reconciliation."""
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()

    kpis = data["kpis"]
    assert kpis["net_revenue"] == pytest.approx(9040.83)
    assert kpis["gross_revenue"] == pytest.approx(12114.22)
    assert kpis["gross_product_revenue_all"] == pytest.approx(12823.28)
    assert kpis["total_orders"] == 99
    assert kpis["realized_orders"] == 95
    assert kpis["canceled_orders"] == 4
    assert kpis["mediation_orders"] == 1
    assert kpis["units_sold"] == 111

    assert len(data["time_series"]) == 8
    assert len(data["financial_breakdown"]) == 6
    assert len(data["sku_ranking"]) == 15
    assert len(data["listing_ranking"]) == 10
    assert len(data["state_breakdown"]) == 13
    assert len(data["ads_breakdown"]) == 2
    assert len(data["status_breakdown"]) == 3

    # Filtered dashboard request
    filtered_resp = client.get(
        "/api/dashboard",
        params={
            "state": "Minas Gerais",
            "start_date": "2023-02-01",
            "end_date": "2023-06-30",
            "ad_sale": "false",
        },
    )
    assert filtered_resp.status_code == 200
    f_data = filtered_resp.json()
    assert f_data["kpis"]["total_orders"] > 0
    assert f_data["kpis"]["total_orders"] < 99
    assert f_data["kpis"]["ad_sales_share_pct"] == 0.0


def test_orders_endpoint_pagination_sorting_and_search(client: TestClient) -> None:
    """Verify GET /api/orders supports pagination, sorting, and search."""
    response = client.get(
        "/api/orders",
        params={"page": 1, "page_size": 5, "sort_by": "net_revenue", "sort_dir": "desc"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 99
    assert data["total_count"] == 99
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert data["total_pages"] == 20
    assert len(data["items"]) == 5

    revenues = [item["net_revenue"] for item in data["items"]]
    assert revenues == sorted(revenues, reverse=True)
    assert all(isinstance(item["order_id"], str) for item in data["items"])

    # Search for specific order with fee sign inversion (2000005066734540)
    inv_resp = client.get("/api/orders", params={"search": "2000005066734540"})
    assert inv_resp.status_code == 200
    inv_items = inv_resp.json()["items"]
    assert len(inv_items) == 1
    assert inv_items[0]["order_id"] == "2000005066734540"
    assert inv_items[0]["sale_fee"] == pytest.approx(16.07)
    assert inv_items[0]["sale_fee_deduction"] == pytest.approx(-16.07)
    assert inv_items[0]["shipping_fee"] == pytest.approx(25.74)
    assert inv_items[0]["shipping_fee_deduction"] == pytest.approx(-25.74)
    assert inv_items[0]["net_revenue"] == pytest.approx(92.09)

    # Search for canceled order and verify lead times are None
    cancel_resp = client.get("/api/orders", params={"status": "Cancelada pelo comprador"})
    assert cancel_resp.status_code == 200
    cancel_items = cancel_resp.json()["items"]
    assert len(cancel_items) == 4
    for item in cancel_items:
        assert item["is_canceled"] is True
        assert item["is_realized"] is False
        assert item["delivery_days"] is None
        assert item["dispatch_days"] is None


def test_upload_and_reset_dataset_endpoints(client: TestClient) -> None:
    """Verify POST /api/upload and POST /api/reset-dataset lifecycle and validation."""
    raw_lines = DEFAULT_CSV_PATH.read_text(encoding="utf-8").splitlines()
    custom_csv_bytes = "\n".join(raw_lines[:16]).encode("utf-8")  # header + 15 rows

    upload_resp = client.post(
        "/api/upload",
        files={"file": ("custom_sales.csv", io.BytesIO(custom_csv_bytes), "text/csv")},
    )
    assert upload_resp.status_code == 200
    up_data = upload_resp.json()
    assert up_data["status"] == "ok"
    assert up_data["active_source"] == "custom_sales.csv"
    assert up_data["dataset_rows"] == 15

    # Verify health reflects uploaded dataset
    health_resp = client.get("/api/health")
    assert health_resp.json()["dataset_rows"] == 15
    assert health_resp.json()["active_source"] == "custom_sales.csv"

    # Reset back to default dataset
    reset_resp = client.post("/api/reset-dataset")
    assert reset_resp.status_code == 200
    reset_data = reset_resp.json()
    assert reset_data["status"] == "ok"
    assert reset_data["active_source"] == "sales_2023.csv"
    assert reset_data["dataset_rows"] == 99


def test_upload_invalid_csv_returns_400(client: TestClient) -> None:
    """Verify POST /api/upload rejects malformed or invalid files with HTTP 400."""
    # Empty file
    empty_resp = client.post(
        "/api/upload",
        files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
    )
    assert empty_resp.status_code == 400

    # Missing required columns
    bad_cols_resp = client.post(
        "/api/upload",
        files={"file": ("bad.csv", io.BytesIO(b"foo,bar\n1,2\n"), "text/csv")},
    )
    assert bad_cols_resp.status_code == 400
    assert "Missing required columns" in bad_cols_resp.json()["detail"]

    # Non-UTF-8 binary payload
    bad_utf8_resp = client.post(
        "/api/upload",
        files={"file": ("binary.csv", io.BytesIO(b"\xff\xfe\x00\x80"), "text/csv")},
    )
    assert bad_utf8_resp.status_code == 400
