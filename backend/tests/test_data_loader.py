"""Unit tests for the Mercado Livre sales CSV ingestion and cleaning layer."""

from __future__ import annotations

import pandas as pd
import pytest

from backend.app.data_loader import (
    DEFAULT_CSV_PATH,
    MAX_CSV_SIZE_BYTES,
    CSVValidationError,
    DatasetStore,
    derive_flavor,
    load_sales_dataframe,
)


@pytest.fixture(scope="module")
def sales_df() -> pd.DataFrame:
    """Load the canonical 2023 sales dataset once per module."""
    return load_sales_dataframe(DEFAULT_CSV_PATH)


def test_dataset_row_count_and_columns(sales_df: pd.DataFrame) -> None:
    """Verify the dataset loads all 99 rows and creates expected normalized columns."""
    assert len(sales_df) == 99
    expected_columns = {
        "order_id",
        "sale_date",
        "status",
        "status_description",
        "is_bundle",
        "units",
        "product_revenue",
        "realized_product_revenue",
        "shipping_revenue",
        "sale_fee",
        "sale_fee_deduction",
        "shipping_fee",
        "shipping_fee_deduction",
        "cancellation_amount",
        "cancellation_deduction",
        "net_revenue",
        "total_brl",
        "is_ad_sale",
        "sku",
        "listing_id",
        "listing_title",
        "variation",
        "flavor",
        "unit_price",
        "listing_type",
        "customer_id",
        "state",
        "state_code",
        "country",
        "delivery_method",
        "shipped_date",
        "delivered_date",
        "dispatch_days",
        "delivery_days",
        "transit_days",
        "has_open_claim",
        "has_closed_claim",
        "in_mediation",
        "is_realized",
        "is_canceled",
        "is_mediation",
    }
    assert expected_columns.issubset(set(sales_df.columns))


def test_rule_1_fee_sign_inversion_normalized(sales_df: pd.DataFrame) -> None:
    """Verify orders 2000005066734540 and 2000005066738224 have normalized fee signs."""
    inverted_ids = ["2000005066734540", "2000005066738224"]
    subset = sales_df[sales_df["order_id"].isin(inverted_ids)]
    assert len(subset) == 2

    for _, row in subset.iterrows():
        assert row["product_revenue"] == pytest.approx(133.90)
        assert row["sale_fee"] == pytest.approx(16.07)
        assert row["sale_fee_deduction"] == pytest.approx(-16.07)
        assert row["shipping_fee"] == pytest.approx(25.74)
        assert row["shipping_fee_deduction"] == pytest.approx(-25.74)
        assert row["net_revenue"] == pytest.approx(92.09)
        reconciled = (
            row["product_revenue"]
            + row["shipping_revenue"]
            + row["sale_fee_deduction"]
            + row["shipping_fee_deduction"]
            + row["cancellation_deduction"]
        )
        assert reconciled == pytest.approx(row["net_revenue"], abs=1e-2)

    assert (sales_df["sale_fee"] >= 0).all()
    assert (sales_df["sale_fee_deduction"] <= 0).all()
    assert (sales_df["shipping_fee"] >= 0).all()
    assert (sales_df["shipping_fee_deduction"] <= 0).all()


def test_rule_2_canceled_orders_excluded_from_lead_times(sales_df: pd.DataFrame) -> None:
    """Verify canceled orders have NaN lead times so they do not distort averages."""
    canceled = sales_df[sales_df["is_canceled"]]
    realized = sales_df[sales_df["is_realized"]]

    assert len(canceled) == 4
    assert len(realized) == 95
    assert canceled["dispatch_days"].isna().all()
    assert canceled["delivery_days"].isna().all()
    assert canceled["transit_days"].isna().all()

    assert realized["dispatch_days"].notna().all()
    assert realized["delivery_days"].notna().all()
    assert (realized["delivery_days"] > 0).all()


def test_rule_3_status_and_revenue_recognition(sales_df: pd.DataFrame) -> None:
    """Verify realized vs canceled revenue recognition and mediation order handling."""
    mediation_row = sales_df[sales_df["order_id"] == "2000004505924241"].iloc[0]
    assert mediation_row["status"] == "Mediação finalizada. Te demos o dinheiro"
    assert bool(mediation_row["is_realized"]) is True
    assert bool(mediation_row["is_canceled"]) is False
    assert bool(mediation_row["is_mediation"]) is True
    assert mediation_row["net_revenue"] == pytest.approx(38.41)
    assert mediation_row["realized_product_revenue"] == pytest.approx(49.90)

    canceled = sales_df[sales_df["status"] == "Cancelada pelo comprador"]
    assert (canceled["net_revenue"] == 0.0).all()
    assert (canceled["realized_product_revenue"] == 0.0).all()
    assert (canceled["product_revenue"] > 0.0).all()
    assert (canceled["cancellation_amount"] > 0.0).all()


def test_rule_4_types_and_boolean_encodings(sales_df: pd.DataFrame) -> None:
    """Verify order_id is string, units is integer, and booleans are properly typed."""
    assert all(isinstance(v, str) and len(v) == 16 for v in sales_df["order_id"])
    assert pd.api.types.is_integer_dtype(sales_df["units"])
    assert set(sales_df["units"].unique()) == {1, 2, 3}

    bool_cols = [
        "is_bundle",
        "is_ad_sale",
        "has_open_claim",
        "has_closed_claim",
        "in_mediation",
        "is_realized",
        "is_canceled",
    ]
    for col in bool_cols:
        assert pd.api.types.is_bool_dtype(sales_df[col]), f"Column {col} is not bool dtype"

    assert int(sales_df["has_closed_claim"].sum()) == 1
    assert int(sales_df["has_open_claim"].sum()) == 0
    assert int(sales_df["in_mediation"].sum()) == 0


def test_rule_5_listing_vs_sku_and_flavor_derivation(sales_df: pd.DataFrame) -> None:
    """Verify PEANUT-CHOCOTINE-600G derives Chocotine flavor despite Sem Sabor variation."""
    peanut_row = sales_df[sales_df["order_id"] == "2000004826452531"].iloc[0]
    assert peanut_row["sku"] == "PEANUT-CHOCOTINE-600G"
    assert peanut_row["variation"] == "Sabor : Sem Sabor"
    assert peanut_row["flavor"] == "Chocotine"

    # Multi-SKU listings preserve both listing_id and individual SKUs
    whey_listing = sales_df[sales_df["listing_id"] == "MLB2787409678"]
    assert whey_listing["sku"].nunique() == 4
    kit_listing = sales_df[sales_df["listing_id"] == "MLB3179617242"]
    assert kit_listing["sku"].nunique() == 3

    assert derive_flavor("PEANUT-CHOCOTINE-600G", "Sabor : Sem Sabor") == "Chocotine"
    assert derive_flavor("KIT-WSC-CREA-250G", "Sabor : Sorvete de creme") == "Sorvete de creme"
    assert derive_flavor("CREAMONO-GROWTH-250G", "Sabor : Sem Sabor") == "Sem Sabor"


def test_csv_validation_errors() -> None:
    """Verify invalid CSV payloads raise CSVValidationError with descriptive messages."""
    with pytest.raises(CSVValidationError, match="empty"):
        load_sales_dataframe(b"")

    with pytest.raises(CSVValidationError, match="size limit"):
        load_sales_dataframe(b"a" * (MAX_CSV_SIZE_BYTES + 1))

    with pytest.raises(CSVValidationError, match="UTF-8"):
        load_sales_dataframe(b"\xff\xfe\x00\x00invalid")

    with pytest.raises(CSVValidationError, match="Missing required columns"):
        load_sales_dataframe(b"col_a,col_b\n1,2\n")

    # Header only (no data rows)
    header_only = DEFAULT_CSV_PATH.read_text(encoding="utf-8").splitlines()[0] + "\n"
    with pytest.raises(CSVValidationError, match="no data rows"):
        load_sales_dataframe(header_only.encode("utf-8"))


def test_dataset_store_upload_and_reset() -> None:
    """Verify DatasetStore can load custom CSV bytes and reset back to default."""
    store = DatasetStore()
    assert len(store.get_dataframe()) == 99
    assert store.get_active_source() == "sales_2023.csv"

    lines = DEFAULT_CSV_PATH.read_text(encoding="utf-8").splitlines()
    subset_csv = "\n".join(lines[:11]).encode("utf-8")
    updated_df = store.update_from_bytes(subset_csv, "subset_10.csv")
    assert len(updated_df) == 10
    assert store.get_active_source() == "subset_10.csv"

    reset_df = store.reset_to_default()
    assert len(reset_df) == 99
    assert store.get_active_source() == "sales_2023.csv"
