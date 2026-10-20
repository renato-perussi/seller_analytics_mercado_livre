"""Ingestion, validation, and data normalization layer for Mercado Livre sales CSV."""

from __future__ import annotations

import io
import math
import threading
from pathlib import Path

import numpy as np
import pandas as pd

DEFAULT_CSV_PATH: Path = Path(__file__).resolve().parents[2] / "data" / "sales_2023.csv"
MAX_CSV_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB

CANCELED_STATUS: str = "Cancelada pelo comprador"
MEDIATION_STATUS: str = "Mediação finalizada. Te demos o dinheiro"
DELIVERED_STATUS: str = "Entregue"

REQUIRED_CSV_COLUMNS: tuple[str, ...] = (
    "N.º de venda",
    "Data da venda",
    "Status",
    "Descrição do status",
    "Pacote de diversos produtos",
    "Unidades",
    "Receita por produtos (BRL)",
    "Receita por envio (BRL)",
    "Tarifa de venda e impostos",
    "Tarifas de envio",
    "Cancelamentos e reembolsos (BRL)",
    "Total (BRL)",
    "Venda por publicidade",
    "SKU",
    "# de anúncio",
    "Título do anúncio",
    "Variação",
    "Preço unitário de venda do anúncio (BRL)",
    "Tipo de anúncio",
    "ID_Cliente",
    "Estado",
    "País",
    "Forma de entrega",
    "Data a caminho completa",
    "Data de entrega completa",
    "Reclamação aberta",
    "Reclamação encerrada",
    "Em mediação",
)

STATE_TO_UF_CODE: dict[str, str] = {
    "Acre": "AC",
    "Alagoas": "AL",
    "Amapá": "AP",
    "Amazonas": "AM",
    "Bahia": "BA",
    "Ceará": "CE",
    "Distrito Federal": "DF",
    "Espírito Santo": "ES",
    "Goiás": "GO",
    "Maranhão": "MA",
    "Mato Grosso": "MT",
    "Mato Grosso do Sul": "MS",
    "Minas Gerais": "MG",
    "Pará": "PA",
    "Paraíba": "PB",
    "Paraná": "PR",
    "Pernambuco": "PE",
    "Piauí": "PI",
    "Rio de Janeiro": "RJ",
    "Rio Grande do Norte": "RN",
    "Rio Grande do Sul": "RS",
    "Rondônia": "RO",
    "Roraima": "RR",
    "Santa Catarina": "SC",
    "São Paulo": "SP",
    "Sergipe": "SE",
    "Tocantins": "TO",
}

SKU_FLAVOR_TOKENS: tuple[tuple[str, str], ...] = (
    ("CHOCOTINE", "Chocotine"),
    ("SORVETECREME", "Sorvete de creme"),
    ("WSC", "Sorvete de creme"),
    ("CHOCOLATE", "Chocolate"),
    ("WCHOC", "Chocolate"),
    ("BAUNILHA", "Baunilha"),
    ("WBAUN", "Baunilha"),
    ("MORANGO", "Morango"),
    ("COOKIES", "Cookies"),
    ("DOCEDELEITE", "Doce de leite"),
)


class CSVValidationError(ValueError):
    """Raised when an uploaded or source CSV file fails structural or content validation."""


def derive_flavor(sku: str, raw_variation: str) -> str:
    """Derive a clean product flavor preferring SKU tokens over potentially misleading Variação.

    Specifically handles anomalies such as SKU 'PEANUT-CHOCOTINE-600G' having
    Variação 'Sabor : Sem Sabor' in the raw Mercado Livre export.
    """
    sku_upper = (sku or "").strip().upper()
    for token, flavor_label in SKU_FLAVOR_TOKENS:
        if token in sku_upper:
            return flavor_label

    cleaned_variation = (raw_variation or "").strip()
    if ":" in cleaned_variation:
        cleaned_variation = cleaned_variation.split(":", 1)[1].strip()
    return cleaned_variation if cleaned_variation else "Sem Sabor"


def parse_sim_nao_bool(value: object, column_name: str = "") -> bool:
    """Convert Mercado Livre 'Sim'/'Não' strings (or boolean-like values) to Python bool."""
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    if value is None or (isinstance(value, float) and math.isnan(value)):
        raise CSVValidationError(f"Null boolean value in column '{column_name}'.")
    normalized = str(value).strip().lower()
    if normalized in {"sim", "true", "1", "1.0", "yes"}:
        return True
    if normalized in {"não", "nao", "false", "0", "0.0", "no"}:
        return False
    raise CSVValidationError(
        f"Invalid boolean value '{value}' in column '{column_name}'. Expected 'Sim' or 'Não'."
    )


def parse_units(value: object) -> int:
    """Cast float-formatted unit strings ('1.0', '2.0') safely to positive integers."""
    try:
        numeric = float(str(value).strip())
        if not math.isfinite(numeric) or numeric <= 0:
            raise ValueError("Non-positive unit count")
        return int(numeric)
    except (ValueError, TypeError) as exc:
        raise CSVValidationError(f"Invalid 'Unidades' value: {value!r}.") from exc


def _read_raw_csv_bytes(source: Path | str | bytes) -> bytes:
    """Read raw bytes from a Path, file path string, or bytes payload with size checks."""
    if isinstance(source, bytes):
        raw_bytes = source
    else:
        path = Path(source)
        if not path.exists() or not path.is_file():
            raise CSVValidationError(f"CSV file not found: {path}")
        raw_bytes = path.read_bytes()

    if len(raw_bytes) == 0:
        raise CSVValidationError("The provided CSV file is empty.")
    if len(raw_bytes) > MAX_CSV_SIZE_BYTES:
        raise CSVValidationError(
            f"CSV file exceeds maximum size limit of {MAX_CSV_SIZE_BYTES // (1024 * 1024)} MB."
        )
    return raw_bytes


def load_sales_dataframe(source: Path | str | bytes = DEFAULT_CSV_PATH) -> pd.DataFrame:
    """Load, validate, and normalize a Mercado Livre sales CSV into a clean DataFrame."""
    raw_bytes = _read_raw_csv_bytes(source)

    try:
        csv_text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise CSVValidationError("CSV file must be encoded in valid UTF-8.") from exc

    if not csv_text.strip():
        raise CSVValidationError("The provided CSV file is empty.")

    try:
        raw_df = pd.read_csv(
            io.StringIO(csv_text),
            dtype={"N.º de venda": str, "SKU": str, "# de anúncio": str, "ID_Cliente": str},
        )
    except Exception as exc:
        raise CSVValidationError(f"Failed to parse CSV content: {exc}") from exc

    missing_columns = [col for col in REQUIRED_CSV_COLUMNS if col not in raw_df.columns]
    if missing_columns:
        raise CSVValidationError(f"Missing required columns in CSV: {', '.join(missing_columns)}")

    if len(raw_df) == 0:
        raise CSVValidationError("CSV file contains headers but no data rows.")

    df = pd.DataFrame()

    # Rule 4: String identifiers and integer units
    df["order_id"] = raw_df["N.º de venda"].astype(str).str.strip()
    if (df["order_id"] == "").any() or df["order_id"].isna().any():
        raise CSVValidationError("Column 'N.º de venda' contains empty order IDs.")

    try:
        df["sale_date"] = pd.to_datetime(raw_df["Data da venda"], format="mixed", errors="raise")
        df["shipped_date"] = pd.to_datetime(
            raw_df["Data a caminho completa"], format="mixed", errors="raise"
        )
        df["delivered_date"] = pd.to_datetime(
            raw_df["Data de entrega completa"], format="mixed", errors="raise"
        )
    except Exception as exc:
        raise CSVValidationError(f"Invalid datetime value in date columns: {exc}") from exc

    df["status"] = raw_df["Status"].astype(str).str.strip()
    df["status_description"] = raw_df["Descrição do status"].astype(str).str.strip()

    # Rule 4: Boolean normalizations
    df["is_bundle"] = [
        parse_sim_nao_bool(v, "Pacote de diversos produtos")
        for v in raw_df["Pacote de diversos produtos"]
    ]
    df["is_ad_sale"] = [
        parse_sim_nao_bool(v, "Venda por publicidade") for v in raw_df["Venda por publicidade"]
    ]
    df["has_open_claim"] = [
        parse_sim_nao_bool(v, "Reclamação aberta") for v in raw_df["Reclamação aberta"]
    ]
    df["in_mediation"] = [parse_sim_nao_bool(v, "Em mediação") for v in raw_df["Em mediação"]]

    try:
        df["has_closed_claim"] = (
            pd.to_numeric(raw_df["Reclamação encerrada"], errors="raise").astype(float) > 0.0
        )
    except Exception as exc:
        raise CSVValidationError(f"Invalid numeric value in 'Reclamação encerrada': {exc}") from exc

    df["units"] = pd.Series([parse_units(v) for v in raw_df["Unidades"]], dtype="int64")

    # Rule 1 & Rule 3: Monetary columns and fee sign normalization
    try:
        product_rev = pd.to_numeric(raw_df["Receita por produtos (BRL)"], errors="raise").astype(
            float
        )
        shipping_rev = pd.to_numeric(raw_df["Receita por envio (BRL)"], errors="raise").astype(
            float
        )
        raw_sale_fee = pd.to_numeric(raw_df["Tarifa de venda e impostos"], errors="raise").astype(
            float
        )
        raw_shipping_fee = pd.to_numeric(raw_df["Tarifas de envio"], errors="raise").astype(float)
        raw_cancellations = pd.to_numeric(
            raw_df["Cancelamentos e reembolsos (BRL)"], errors="raise"
        ).astype(float)
        total_brl = pd.to_numeric(raw_df["Total (BRL)"], errors="raise").astype(float)
        unit_price = pd.to_numeric(
            raw_df["Preço unitário de venda do anúncio (BRL)"], errors="raise"
        ).astype(float)
    except Exception as exc:
        raise CSVValidationError(f"Invalid numeric value in financial columns: {exc}") from exc

    df["product_revenue"] = product_rev.round(2)
    df["shipping_revenue"] = shipping_rev.round(2)

    # Normalize fee magnitudes (always >= 0) and fee deductions (always <= 0)
    sale_fee_mag = raw_sale_fee.abs().round(2)
    shipping_fee_mag = raw_shipping_fee.abs().round(2)
    cancel_mag = raw_cancellations.abs().round(2)

    df["sale_fee"] = sale_fee_mag
    df["sale_fee_deduction"] = np.where(sale_fee_mag == 0.0, 0.0, -sale_fee_mag)
    df["shipping_fee"] = shipping_fee_mag
    df["shipping_fee_deduction"] = np.where(shipping_fee_mag == 0.0, 0.0, -shipping_fee_mag)
    df["cancellation_amount"] = cancel_mag
    df["cancellation_deduction"] = np.where(cancel_mag == 0.0, 0.0, -cancel_mag)
    df["net_revenue"] = total_brl.round(2)
    df["total_brl"] = df["net_revenue"]
    df["unit_price"] = unit_price.round(2)

    # Rule 3: Status & revenue recognition flags
    df["is_canceled"] = (df["status"] == CANCELED_STATUS).astype(bool)
    df["is_realized"] = (~df["is_canceled"]).astype(bool)
    df["is_mediation"] = (
        (df["status"] == MEDIATION_STATUS)
        | df["in_mediation"]
        | df["has_closed_claim"]
        | df["has_open_claim"]
    ).astype(bool)
    df["realized_product_revenue"] = np.where(df["is_realized"], df["product_revenue"], 0.0)

    # Rule 5: Listing vs. SKU hierarchy and flavor derivation
    df["sku"] = raw_df["SKU"].astype(str).str.strip()
    df["listing_id"] = raw_df["# de anúncio"].astype(str).str.strip()
    df["listing_title"] = raw_df["Título do anúncio"].astype(str).str.strip()
    df["variation"] = raw_df["Variação"].astype(str).str.strip()
    df["flavor"] = [
        derive_flavor(sku, var) for sku, var in zip(df["sku"], df["variation"], strict=True)
    ]

    df["listing_type"] = raw_df["Tipo de anúncio"].astype(str).str.strip()
    df["customer_id"] = raw_df["ID_Cliente"].astype(str).str.strip()
    df["state"] = raw_df["Estado"].astype(str).str.strip()
    df["state_code"] = [STATE_TO_UF_CODE.get(s, s[:2].upper()) for s in df["state"]]
    df["country"] = raw_df["País"].astype(str).str.strip()
    df["delivery_method"] = raw_df["Forma de entrega"].astype(str).str.strip()

    # Rule 2: Exclude canceled orders from shipping/delivery lead times
    raw_dispatch_days = (df["shipped_date"] - df["sale_date"]).dt.total_seconds() / 86400.0
    raw_delivery_days = (df["delivered_date"] - df["sale_date"]).dt.total_seconds() / 86400.0
    raw_transit_days = (df["delivered_date"] - df["shipped_date"]).dt.total_seconds() / 86400.0

    df["dispatch_days"] = np.where(df["is_canceled"], np.nan, raw_dispatch_days)
    df["delivery_days"] = np.where(df["is_canceled"], np.nan, raw_delivery_days)
    df["transit_days"] = np.where(df["is_canceled"], np.nan, raw_transit_days)

    return df


class DatasetStore:
    """Thread-safe in-memory store for the active Mercado Livre sales dataset."""

    def __init__(self, default_path: Path = DEFAULT_CSV_PATH) -> None:
        self._lock = threading.RLock()
        self._default_path = default_path
        self._df: pd.DataFrame = load_sales_dataframe(default_path)
        self._active_source: str = default_path.name

    def get_dataframe(self) -> pd.DataFrame:
        """Return a copy of the active normalized DataFrame."""
        with self._lock:
            return self._df.copy()

    def get_active_source(self) -> str:
        """Return the filename of the currently active dataset."""
        with self._lock:
            return self._active_source

    def update_from_bytes(self, content: bytes, filename: str) -> pd.DataFrame:
        """Validate and load a new CSV byte payload as the active dataset."""
        new_df = load_sales_dataframe(content)
        clean_name = Path(filename or "uploaded.csv").name
        with self._lock:
            self._df = new_df
            self._active_source = clean_name
            return self._df.copy()

    def reset_to_default(self) -> pd.DataFrame:
        """Restore the default sales_2023.csv dataset."""
        default_df = load_sales_dataframe(self._default_path)
        with self._lock:
            self._df = default_df
            self._active_source = self._default_path.name
            return self._df.copy()


dataset_store = DatasetStore()
