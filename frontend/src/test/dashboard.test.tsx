import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GlobalFilterBar } from '../components/GlobalFilterBar';
import { KpiSection } from '../components/KpiSection';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { StatusBadge } from '../components/StatusBadge';
import type {
  DashboardFilterState,
  DashboardKPIs,
  FiltersResponse,
  OrderRecord,
} from '../types/dashboard';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatDateTimeBR,
  formatDaysBR,
  formatIntegerBR,
  formatPercentBR,
  getStatusDisplayMeta,
} from '../utils/formatters';

describe('pt-BR Formatting Utilities', () => {
  it('formats BRL currency with R$ prefix, dot thousand separator, and comma decimals', () => {
    expect(formatCurrencyBRL(9040.83)).toBe('R$ 9.040,83');
    expect(formatCurrencyBRL(12118.5)).toBe('R$ 12.118,50');
    expect(formatCurrencyBRL(0)).toBe('R$ 0,00');
    expect(formatCurrencyBRL(-16.07)).toBe('-R$ 16,07');
  });

  it('formats percentages with pt-BR decimal comma', () => {
    expect(formatPercentBR(74.6)).toBe('74,6%');
    expect(formatPercentBR(3.03, 2)).toBe('3,03%');
  });

  it('formats dates and datetimes in DD/MM/YYYY format', () => {
    expect(formatDateBR('2023-05-21')).toBe('21/05/2023');
    expect(formatDateTimeBR('2023-05-21 15:30:00')).toBe('21/05/2023 às 15:30');
  });

  it('formats lead time days and handles null values for canceled orders', () => {
    expect(formatDaysBR(7.12)).toBe('7,1 d');
    expect(formatDaysBR(null)).toBe('—');
    expect(formatIntegerBR(1234)).toBe('1.234');
  });

  it('maps Mercado Livre order statuses to semantic metadata', () => {
    expect(getStatusDisplayMeta('Entregue').tone).toBe('emerald');
    expect(
      getStatusDisplayMeta('Mediação finalizada. Te demos o dinheiro').tone,
    ).toBe('amber');
    expect(getStatusDisplayMeta('Cancelada pelo comprador').tone).toBe('red');
  });
});

describe('Executive KPI Cards (Level 1)', () => {
  const sampleKpis: DashboardKPIs = {
    net_revenue: 9040.83,
    gross_revenue: 12118.5,
    gross_product_revenue_all: 12520.2,
    shipping_revenue: 251.98,
    sale_fees: 1384.22,
    shipping_fees: 1945.43,
    net_shipping_cost: 1693.45,
    total_fees: 3329.65,
    fee_burden_pct: 26.92,
    net_margin_pct: 74.6,
    total_orders: 99,
    realized_orders: 96,
    canceled_orders: 3,
    cancellation_amount: 427.44,
    cancellation_rate_pct: 3.03,
    mediation_orders: 1,
    units_sold: 102,
    average_ticket: 94.18,
    gross_average_ticket: 126.23,
    avg_delivery_days: 7.1,
    avg_dispatch_days: 0.9,
    avg_transit_days: 6.2,
    ad_sales_share_pct: 52.08,
  };

  it('renders all 5 executive KPI cards with exact pt-BR values', () => {
    render(<KpiSection kpis={sampleKpis} />);

    expect(screen.getByText('Receita Líquida Realizada')).toBeInTheDocument();
    expect(screen.getByText('R$ 9.040,83')).toBeInTheDocument();
    expect(screen.getByText(/Margem Líquida: 74,6%/)).toBeInTheDocument();

    expect(screen.getByText('Faturamento Bruto Realizado')).toBeInTheDocument();
    expect(screen.getByText('R$ 94,18')).toBeInTheDocument();

    expect(screen.getByText('Pedidos Realizados')).toBeInTheDocument();
    expect(screen.getByText(/102 unidades entregues/)).toBeInTheDocument();

    expect(screen.getByText('Tarifas ML & Custo de Frete')).toBeInTheDocument();
    expect(screen.getByText('-R$ 3.329,65')).toBeInTheDocument();

    expect(screen.getByText('Prazo Médio de Entrega')).toBeInTheDocument();
    expect(screen.getByText('7,1')).toBeInTheDocument();
  });
});

describe('StatusBadge & GlobalFilterBar & OrderDetailModal', () => {
  it('renders semantic status badges with labels', () => {
    render(
      <div>
        <StatusBadge status="Entregue" />
        <StatusBadge status="Mediação finalizada. Te demos o dinheiro" />
        <StatusBadge status="Cancelada pelo comprador" />
      </div>,
    );

    expect(screen.getByText('Entregue')).toBeInTheDocument();
    expect(screen.getByText('Mediação ganha')).toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });

  it('enables Limpar Filtros button and displays active filter chips when filtered', () => {
    const onUpdateFilter = vi.fn();
    const onResetFilters = vi.fn();

    const activeFilters: DashboardFilterState = {
      start_date: '2023-01-01',
      end_date: '2023-09-30',
      state: 'São Paulo',
      sku: 'all',
      listing_id: 'all',
      status: 'all',
      ad_sale: 'true',
      search: 'Chocotine',
      granularity: 'month',
    };

    const filterOptions: FiltersResponse = {
      min_date: '2023-01-01',
      max_date: '2023-09-30',
      states: ['São Paulo', 'Minas Gerais'],
      skus: ['PEANUT-CHOCOTINE-600G'],
      listings: ['MLB3179617242'],
      statuses: ['Entregue'],
      sku_options: [],
      listing_options: [],
      active_source: 'sales_2023.csv',
      total_rows: 99,
    };

    render(
      <GlobalFilterBar
        filters={activeFilters}
        options={filterOptions}
        hasActiveFilters={true}
        onUpdateFilter={onUpdateFilter}
        onResetFilters={onResetFilters}
      />,
    );

    expect(screen.getByText('UF: São Paulo')).toBeInTheDocument();
    expect(screen.getByText('Canal: Com Publicidade (Ads)')).toBeInTheDocument();
    expect(screen.getByText('Busca: "Chocotine"')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /Limpar Filtros/i });
    expect(resetBtn).not.toBeDisabled();
    fireEvent.click(resetBtn);
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  it('renders OrderDetailModal financial reconciliation and closes on click', () => {
    const onClose = vi.fn();
    const sampleOrder: OrderRecord = {
      order_id: '2000005066734540',
      sale_date: '2023-09-12 00:54:00',
      sale_date_br: '12/09/2023 00:54',
      status: 'Entregue',
      status_description: 'Entregue no dia 15 de setembro',
      is_realized: true,
      is_canceled: false,
      is_mediation: false,
      is_bundle: false,
      units: 1,
      product_revenue: 133.9,
      shipping_revenue: 0.0,
      sale_fee: 16.07,
      sale_fee_deduction: -16.07,
      shipping_fee: 25.74,
      shipping_fee_deduction: -25.74,
      cancellation_amount: 0.0,
      cancellation_deduction: 0.0,
      net_revenue: 92.09,
      total_brl: 92.09,
      is_ad_sale: true,
      sku: 'PEANUT-CHOCOTINE-1KG',
      listing_id: 'MLB2787409678',
      listing_title: 'Pasta De Amendoim Chocotine 1kg',
      variation: 'Sabor:Chocotine',
      flavor: 'Chocotine',
      unit_price: 133.9,
      listing_type: 'Clássico',
      customer_id: 'CLI_144785777',
      state: 'São Paulo',
      state_code: 'SP',
      country: 'Brasil',
      delivery_method: 'Mercado Envios Pelos Correios',
      shipped_date: '2023-09-12 13:21:00',
      delivered_date: '2023-09-15 18:10:00',
      dispatch_days: 0.52,
      delivery_days: 3.72,
      transit_days: 3.2,
      has_open_claim: false,
      has_closed_claim: false,
      in_mediation: false,
    };

    render(<OrderDetailModal order={sampleOrder} onClose={onClose} />);

    expect(screen.getByText('#2000005066734540')).toBeInTheDocument();
    expect(screen.getByText('+R$ 133,90')).toBeInTheDocument();
    expect(screen.getByText('-R$ 16,07')).toBeInTheDocument();
    expect(screen.getByText('R$ 92,09')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', {
      name: /Fechar detalhes do pedido/i,
    });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
