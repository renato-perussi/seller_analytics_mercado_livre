import type { OrderRecord } from '../types/dashboard';

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

/**
 * Formats a numeric value into Brazilian Real currency (e.g. "R$ 1.234,56").
 */
export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'R$ 0,00';
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  return brlFormatter.format(normalized).replace(/\u00A0/g, ' ');
}

/**
 * Formats a numeric value for compact chart axes in BRL (e.g. "R$ 9,5 mil" or "R$ 850").
 */
export function formatCompactCurrencyBRL(value: number): string {
  if (Number.isNaN(value)) return 'R$ 0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} mi`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} mil`;
  }
  return `${sign}R$ ${abs.toLocaleString('pt-BR', {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Formats a percentage value (already in 0-100 scale) using pt-BR decimal comma (e.g. "74,6%").
 */
export function formatPercentBR(
  value: number | null | undefined,
  fractionDigits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0,0%';
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  return `${normalized.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

/**
 * Formats an integer value with pt-BR thousand separators.
 */
export function formatIntegerBR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0';
  }
  return integerFormatter.format(Math.round(value));
}

/**
 * Formats a decimal number with pt-BR comma separator.
 */
export function formatDecimalBR(
  value: number | null | undefined,
  fractionDigits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0,0';
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Formats lead-time days in pt-BR (e.g. "7,1 dias"), returning "—" when null (such as canceled orders).
 */
export function formatDaysBR(
  value: number | null | undefined,
  fractionDigits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${formatDecimalBR(value, fractionDigits)} d`;
}

/**
 * Formats an ISO date ("YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS") into Brazilian "DD/MM/YYYY".
 */
export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const clean = dateStr.trim();
  const datePart = clean.split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
}

/**
 * Formats an ISO datetime ("YYYY-MM-DD HH:MM:SS") into Brazilian "DD/MM/YYYY HH:mm".
 */
export function formatDateTimeBR(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '—';
  const clean = dateTimeStr.trim();
  const [datePart, timePart] = clean.split(' ');
  const brDate = formatDateBR(datePart);
  if (!timePart) return brDate;
  const hhmm = timePart.slice(0, 5);
  return `${brDate} às ${hhmm}`;
}

export type SemanticTone = 'emerald' | 'amber' | 'red' | 'slate';

export interface StatusDisplayMeta {
  shortLabel: string;
  fullLabel: string;
  tone: SemanticTone;
}

/**
 * Maps Mercado Livre order status strings to semantic tokens and user-friendly pt-BR labels.
 */
export function getStatusDisplayMeta(status: string): StatusDisplayMeta {
  const normalized = (status || '').trim().toLowerCase();

  if (normalized === 'entregue') {
    return {
      shortLabel: 'Entregue',
      fullLabel: 'Entregue ao comprador',
      tone: 'emerald',
    };
  }

  if (normalized.includes('mediação') || normalized.includes('mediacao')) {
    return {
      shortLabel: 'Mediação ganha',
      fullLabel: 'Mediação finalizada (favorável ao vendedor)',
      tone: 'amber',
    };
  }

  if (normalized.includes('cancelada')) {
    return {
      shortLabel: 'Cancelada',
      fullLabel: 'Cancelada pelo comprador',
      tone: 'red',
    };
  }

  return {
    shortLabel: status || 'Desconhecido',
    fullLabel: status || 'Status não informado',
    tone: 'slate',
  };
}

/**
 * Generates and triggers a browser download of a UTF-8 CSV file for the given order records.
 */
export function exportOrdersToCsv(
  orders: OrderRecord[],
  filename = 'vendas_mercado_livre_export.csv',
): void {
  const headers = [
    'N.º de venda',
    'Data da venda',
    'Status',
    'SKU',
    '# de anúncio',
    'Título do anúncio',
    'Sabor / Variante',
    'UF',
    'Estado',
    'ID Cliente',
    'Unidades',
    'Venda por Publicidade',
    'Receita Produtos (BRL)',
    'Receita Envio (BRL)',
    'Tarifa Venda (BRL)',
    'Tarifa Envio (BRL)',
    'Cancelamentos (BRL)',
    'Total Líquido (BRL)',
    'Prazo Postagem (dias)',
    'Prazo Entrega (dias)',
  ];

  const escapeCsvCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (typeof val === 'string' && /^[=+@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = orders.map((order) => [
    order.order_id,
    order.sale_date_br,
    order.status,
    order.sku,
    order.listing_id,
    order.listing_title,
    order.flavor,
    order.state_code,
    order.state,
    order.customer_id,
    order.units,
    order.is_ad_sale ? 'Sim' : 'Não',
    order.product_revenue.toFixed(2).replace('.', ','),
    order.shipping_revenue.toFixed(2).replace('.', ','),
    order.sale_fee_deduction.toFixed(2).replace('.', ','),
    order.shipping_fee_deduction.toFixed(2).replace('.', ','),
    order.cancellation_deduction.toFixed(2).replace('.', ','),
    order.net_revenue.toFixed(2).replace('.', ','),
    order.dispatch_days !== null ? order.dispatch_days.toFixed(2).replace('.', ',') : '',
    order.delivery_days !== null ? order.delivery_days.toFixed(2).replace('.', ',') : '',
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCsvCell).join(';'), ...rows.map((r) => r.map(escapeCsvCell).join(';'))].join(
      '\r\n',
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
