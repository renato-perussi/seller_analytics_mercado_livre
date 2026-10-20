# Plano de Implementação — Dashboard de Acompanhamento de Vendas (Mercado Livre)

## 1. Visão Geral da Arquitetura e Design

- **Backend (`backend/`)**: Python 3.12 (`.venv`), **FastAPI**, **Pandas** e **Pydantic**. Responsável pela ingestão, higienização do CSV, cálculo de KPIs/agregações e exposição de endpoints REST (incluindo suporte a upload de novos CSVs no padrão Mercado Livre).
- **Frontend (`frontend/`)**: **React 18 + Vite + TypeScript**, estilizado com **Tailwind CSS**, gráficos interativos com **Recharts** e ícones **Lucide React**.
- **Identidade Visual (Mercado Livre Analytics)**:
  - **Paleta Tailwind customizada**: Amarelo ML (`#FFE600`) na barra de topo/destaques, Azul Escuro ML (`#2D3277`) na navegação/estrutura, Azul Royal (`#3483FA`) em ações primárias e séries principais, superfície neutra (`#F8FAFC` / cards `#FFFFFF` e suporte a Dark Mode) e cores semânticas para status (Verde `#10B981` para *Entregue*, Âmbar `#F59E0B` para *Mediação*, Vermelho `#EF4444` para *Cancelada*).
  - **Localização (`pt-BR`)**: Moeda formatada em `R$ 1.234,56`, percentuais com vírgula decimal e datas em `DD/MM/YYYY`. Código-fonte, rotas, identificadores e testes em inglês (conforme `AGENTS.md`).

---

## 2. Regras de Negócio e Tratamento de Dados (`data/sales_2023.csv`)

A camada de ingestão tratará automaticamente as 5 anomalias verificadas nos 99 pedidos do arquivo:

1. **Inversão de sinal nas tarifas (linhas 97–98)**:
   - Os pedidos `2000005066734540` e `2000005066738224` trazem `Tarifa de venda e impostos` (`16.07`) e `Tarifas de envio` (`25.74`) positivos, embora o `Total (BRL)` (`92.09`) já os desconte (`133.90 - 16.07 - 25.74 = 92.09`).
   - Todas as tarifas serão normalizadas com `-abs(valor)` (dedução) e `abs(valor)` (magnitude).
2. **Status de venda e reconhecimento de receita**:
   - `"Entregue"` (94 pedidos) e `"Mediação finalizada. Te demos o dinheiro"` (1 pedido, `2000004505924241`): compõem as **Vendas Realizadas** (95 pedidos) e a **Receita Líquida (`Total (BRL)`)**.
   - `"Cancelada pelo comprador"` (4 pedidos): `Total (BRL)` é `0.0`, mas `Receita por produtos (BRL)` permanece positiva no CSV sendo anulada por `Cancelamentos e reembolsos (BRL)`. O Faturamento Bruto realizado descontará os cancelamentos.
3. **Tempo de entrega (Lead Time) sem distorção**:
   - Pedidos cancelados repetem o timestamp de `Data da venda` em `Data a caminho completa` e `Data de entrega completa` (delta zero) e serão excluídos do cálculo de tempo médio de envio/entrega.
4. **Padronização de tipos**:
   - `N.º de venda` mantido como `str` (16 dígitos) para evitar perda de precisão.
   - `Unidades` convertido via `int(float(val))`.
   - Colunas `"Sim"/"Não"` (`Pacote de diversos produtos`, `Venda por publicidade`, `Reclamação aberta`, `Em mediação`) e `Reclamação encerrada` (`0.0`/`1.0`) convertidas para `bool`.
5. **Hierarquia Anúncio vs. SKU**:
   - Agrupamento tanto por `# de anúncio` (ex.: `MLB2787409678` e `MLB3179617242` agrupam múltiplos sabores) quanto por `SKU` (corrigindo casos como `PEANUT-CHOCOTINE-600G`, cuja coluna `Variação` veio como `"Sabor : Sem Sabor"`).

---

## 3. Arquitetura de Informação do Dashboard (3 Níveis)

1. **Barra Global de Filtros (Topo)**:
   - Intervalo de datas (`Data da venda` — Jan a Set/2023), Estado (`UF`), Produto (`SKU` / `# de anúncio`), Status da venda, Venda por Publicidade (`Todas` / `Com Ads` / `Orgânica`), botão **"Limpar Filtros"** e botão **"Importar CSV"**.
2. **Nível 1 — Resumo Executivo (5 KPI Cards)**:
   - **Receita Líquida Realizada (`Total BRL`)** + Margem Líquida (%) sobre a receita bruta.
   - **Faturamento Bruto Realizado** + Ticket Médio por pedido válido.
   - **Pedidos Realizados & Unidades Vendidas** + Taxa de Cancelamento (%) e Mediações.
   - **Custo Total de Tarifas ML + Frete Líquido** + peso percentual sobre o faturamento.
   - **Prazo Médio de Entrega (Correios)** em dias corridos (Trânsito vs. Postagem).
3. **Nível 2 — Contexto Analítico (Gráficos Interativos)**:
   - **Evolução Mensal/Semanal de Vendas**: Faturamento Bruto vs. Receita Líquida e volume de pedidos ao longo do tempo.
   - **Decomposição Financeira (Bruto → Líquido)**: Cascata/composição mostrando Receita de Produtos + Receita de Envio − Tarifas de Venda − Tarifas de Envio − Cancelamentos = Receita Líquida.
   - **Ranking de Produtos (por SKU e por Anúncio MLB)**: Barras horizontais com Receita Líquida, Unidades e Margem por produto/sabor.
   - **Desempenho Geográfico e Logístico por Estado (`UF`)**: Receita/Pedidos por estado (SP, MG, PR, SC, RJ, etc.) + Prazo médio de entrega por UF.
   - **Eficiência de Publicidade (Mercado Ads vs. Orgânico)**: Comparação de participação nas vendas, ticket médio e margem líquida.
4. **Nível 3 — Detalhamento Operacional (Tabela de Pedidos)**:
   - Tabela com busca por `N.º de venda`, `ID_Cliente`, `SKU` ou título, ordenação por coluna, paginação, badges semânticos de status, detalhamento de taxas por pedido e exportação para CSV.

---

## 4. Etapas de Implementação

### Etapa 1 — Setup do Backend & Camada de Ingestão de Dados (TDD)
- [x] Criar `requirements.txt` (`fastapi`, `uvicorn`, `pandas`, `pydantic`, `python-multipart`, `pytest`, `httpx`, `ruff`) e instalar dependências no `.venv`.
- [x] Implementar `backend/app/schemas.py` e `backend/app/data_loader.py` com carregamento, limpeza e validação das 5 regras de dados do `data/sales_2023.csv`.
- [x] Criar testes unitários em `backend/tests/test_data_loader.py` validando a correção das linhas 97–98, exclusão de cancelados no lead time e tipagem.

### Etapa 2 — Motor Analítico e Cálculo de KPIs (TDD)
- [x] Implementar `backend/app/analytics.py` com funções puras de filtragem e cálculo dos KPIs executivos, séries temporais, decomposição de taxas, ranking de SKUs/anúncios, métricas por UF e comparativo de publicidade.
- [x] Criar testes em `backend/tests/test_analytics.py` garantindo que a soma das partes bata exatamente com o `Total (BRL)` do dataset.

### Etapa 3 — API REST FastAPI
- [x] Implementar `backend/app/main.py` com CORS configurado e os endpoints:
  - `GET /api/health`
  - `GET /api/filters` (opções dinâmicas de UFs, SKUs, anúncios, status e limites de datas)
  - `GET /api/dashboard` (retorna KPIs + todas as séries dos gráficos filtradas)
  - `GET /api/orders` (lista paginada, ordenada e filtrada de pedidos)
  - `POST /api/upload` (permite carregar um novo CSV em memória/sessão ou restaurar o dataset padrão)
- [x] Criar testes de integração da API em `backend/tests/test_api.py`.

### Etapa 4 — Setup do Frontend React + TypeScript + Tailwind CSS
- [x] Inicializar o projeto em `frontend/` com Vite (`react-ts`), instalar e configurar **Tailwind CSS**, `recharts` e `lucide-react`.
- [x] Configurar o design system inspirado no Mercado Livre no `tailwind.config.js`, utilitários de formatação `pt-BR` (`formatCurrencyBRL`, `formatDateBR`, `formatPercentBR`) e cliente tipado da API (`frontend/src/api/`).

### Etapa 5 — Construção da Interface e Componentes do Dashboard
- [x] **Header & Barra de Filtros Globais**: Cabeçalho estilo Mercado Livre Seller Center, seletores de período, UF, SKU, Status, Publicidade, botão de reset e botão de upload de CSV.
- [x] **Seção de KPIs Executivos**: 5 cards com indicadores visuais, sub-métricas de comparação e ícones semânticos.
- [x] **Grid de Gráficos Analíticos**:
  - Gráfico de evolução temporal (Receita Bruta vs. Líquida + Pedidos);
  - Gráfico de decomposição de receitas, tarifas de venda e frete;
  - Gráfico de barras horizontais de Top SKUs / Anúncios;
  - Painel geográfico por Estado (`UF`) com receita e prazo de entrega;
  - Comparativo Vendas por Publicidade vs. Orgânicas.
- [x] **Tabela Operacional de Vendas**: Busca instantânea, ordenação, paginação, badges de status e modal/gaveta de detalhes financeiros do pedido.

### Etapa 6 — Validação Final, Lint, Testes e QA Visual
- [x] Executar `.venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/pytest`.
- [x] Executar build de checagem de tipos do frontend (`npm run build`).
- [x] Subir backend e frontend e validar responsividade, filtros interativos e fidelidade dos números.
