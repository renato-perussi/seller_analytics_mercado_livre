# AGENTS.md

## Stack & Layout
- Full-stack sales analytics: Python 3.12 + FastAPI + Pandas + Pydantic (`backend/app/`) and React 18 + Vite + TS + Tailwind + Recharts (`frontend/src/`). Source dataset `data/sales_2023.csv` (99 rows, UTF-8). Not a git repo.
- Entrypoints: backend `backend.app.main:app`; frontend `frontend/src/main.tsx` → `App.tsx`. API base path `/api`; Vite dev server proxies `/api → http://127.0.0.1:8000`.
- `backend/app/`: `main.py` (routes/CORS), `data_loader.py` (ingestion + in-memory `dataset_store`), `analytics.py` (pure filter/KPI functions), `schemas.py` (Pydantic). Tests mirror modules in `backend/tests/`.
- **Language & Locale**: code, identifiers, API fields, tests, comments in English; UI copy, chart labels, formatting in `pt-BR` (`R$ 1.234,56`, `DD/MM/YYYY`).

## Commands (repo root; always `.venv` binaries, never system Python)
- **Prod install**: `.venv/bin/pip install -r requirements.txt` (fastapi, uvicorn, pandas, pydantic, python-multipart).
- **Dev install**: `.venv/bin/pip install -r requirements_dev.txt` (adds pytest, httpx for `TestClient`, ruff).
- **Verify (in order)**: `.venv/bin/ruff check .` → `.venv/bin/ruff format --check .` → `.venv/bin/pytest` (ruff: line-length 100, py312; pytest: `pythonpath=["."]`, `testpaths=["backend/tests"]` — run from root).
- **Single test**: `.venv/bin/pytest backend/tests/test_api.py -k "test_name"`.
- **Serve**: `.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000` + `cd frontend && npm run dev` (port 5173).
- **Frontend**: `npm run typecheck`, `npm test` (vitest + jsdom, setup `src/test/setup.ts`), `npm run build` (`tsc -b && vite build`).

## Env & API Gotchas
- `CORS_ALLOWED_ORIGINS` (backend, comma-separated; default `localhost`/`127.0.0.1` on 5173/4173). `VITE_API_BASE_URL` (frontend, default `""` = relative `/api` via Vite proxy; set to backend URL on split deploys).
- Upload (`POST /api/upload`): `.csv` extension only, ≤10 MB (`MAX_CSV_SIZE_BYTES`), empty/off-schema → 400. Dataset is in-memory; restore default via `POST /api/reset` (alias `/api/reset-dataset`).

## `data/sales_2023.csv` Quirks (Critical for Ingestion & KPIs)
1. **Sign inversion in fee columns (rows 97–98)**: `Tarifa de venda e impostos` and `Tarifas de envio` are negative in 97/99 rows, **except** orders `2000005066734540` and `2000005066738224` where they are positive (`16.07`/`25.74`) although `Total (BRL)` (`92.09`) already subtracts them. **Rule**: never sum raw fee columns; normalize with `-abs(val)` (deductions) or `abs(val)` (magnitudes).
2. **Canceled orders distort lead time**: `Status == "Cancelada pelo comprador"` (4 rows) repeats `Data da venda` in shipping/delivery timestamps (0-minute delta). **Rule**: exclude canceled orders from dispatch/delivery/transit lead times.
3. **Three `Status` states & revenue recognition**: `"Entregue"` (94) + `"Mediação finalizada. Te demos o dinheiro"` (1 row, order `2000004505924241`, `Total 38.41`) = realized net revenue; `"Cancelada pelo comprador"` (4) has `Total 0.0` with product revenue offset by negative `Cancelamentos e reembolsos`. Don't sum `Receita por produtos (BRL)` for gross/net without accounting for cancellations.
4. **Inconsistent encodings**: `"Sim"`/`"Não"` → bool (`Pacote de diversos produtos`, `Venda por publicidade`, `Reclamação aberta`, `Em mediação`); `Reclamação encerrada` `0.0`/`1.0` → bool; `Unidades` via `int(float(val))`; `N.º de venda` as `str` (16 digits, JSON/JS precision).
5. **Listing vs. SKU hierarchy**: multiple flavor `SKU`s share one `# de anúncio` (e.g. `MLB2787409678`, `MLB3179617242`) — group listings by `# de anúncio`, flavors by `SKU`. Prefer `SKU` over `Variação` for flavor (order `2000004826452531`, `PEANUT-CHOCOTINE-600G`, has `Variação "Sabor : Sem Sabor"`).
