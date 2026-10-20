import React, { useEffect } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  MapPin,
  Megaphone,
  Package,
  Receipt,
  Scale,
  ShieldAlert,
  Truck,
  User,
  X,
} from 'lucide-react';
import type { OrderRecord } from '../types/dashboard';
import {
  formatCurrencyBRL,
  formatDateTimeBR,
  formatDaysBR,
  formatIntegerBR,
} from '../utils/formatters';
import { StatusBadge } from './StatusBadge';

interface OrderDetailModalProps {
  order: OrderRecord | null;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
}) => {
  useEffect(() => {
    if (!order) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, onClose]);

  if (!order) return null;

  const netShipping = Number(
    (order.shipping_revenue + order.shipping_fee_deduction).toFixed(2),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-order-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-ml-yellow" />

        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Pedido N.º
              </span>
              <h2
                id="modal-order-title"
                className="font-mono text-base font-bold text-slate-900 dark:text-white"
              >
                #{order.order_id}
              </h2>
              <StatusBadge status={order.status} size="sm" showFullLabel />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Venda registrada em {order.sale_date_br} • {order.status_description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do pedido"
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-5 p-6">
          {/* Section 1: Financial Reconciliation */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Receipt className="h-4 w-4 text-ml-blue" aria-hidden="true" />
                Conciliação Financeira do Pedido (BRL)
              </h3>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {order.units} {order.units === 1 ? 'unidade' : 'unidades'} ×{' '}
                {formatCurrencyBRL(order.unit_price)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  (+) Receita por produtos (BRL):
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  +{formatCurrencyBRL(order.product_revenue)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  (+) Receita por envio (BRL):
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  +{formatCurrencyBRL(order.shipping_revenue)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  (−) Tarifa de venda e impostos:
                </span>
                <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                  {formatCurrencyBRL(order.sale_fee_deduction)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  (−) Tarifas de envio (Frete líquido:{' '}
                  {formatCurrencyBRL(netShipping)}):
                </span>
                <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                  {formatCurrencyBRL(order.shipping_fee_deduction)}
                </span>
              </div>

              {order.cancellation_amount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-red-600 dark:text-red-400">
                    (−) Cancelamentos e reembolsos (BRL):
                  </span>
                  <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                    {formatCurrencyBRL(order.cancellation_deduction)}
                  </span>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2.5 text-sm font-bold dark:border-slate-700">
                <span className="text-slate-900 dark:text-white">
                  (=) Total Líquido Recebido (Total BRL):
                </span>
                <span className="font-mono text-base text-emerald-700 dark:text-emerald-400">
                  {formatCurrencyBRL(order.net_revenue)}
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: Product, SKU & Channel Info */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Package className="h-4 w-4 text-ml-blue" aria-hidden="true" />
                Produto, SKU & Anúncio
              </h3>
              <dl className="space-y-1.5 text-xs">
                <div>
                  <dt className="text-[11px] text-slate-500 dark:text-slate-400">
                    Título do Anúncio
                  </dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {order.listing_title}
                  </dd>
                </div>
                <div className="flex justify-between pt-1">
                  <dt className="text-slate-500 dark:text-slate-400">SKU:</dt>
                  <dd className="font-mono font-bold text-ml-blue dark:text-blue-400">
                    {order.sku}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">
                    # de Anúncio:
                  </dt>
                  <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {order.listing_id} ({order.listing_type})
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">
                    Sabor (via SKU):
                  </dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {order.flavor}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">
                    Variação (CSV):
                  </dt>
                  <dd className="text-slate-700 dark:text-slate-300">
                    {order.variation}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">
                    Canal de Venda:
                  </dt>
                  <dd className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                    <Megaphone className="h-3 w-3 text-ml-blue" aria-hidden="true" />
                    {order.is_ad_sale
                      ? 'Com Publicidade (Mercado Ads)'
                      : 'Orgânico'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Section 3: Customer, Geography & Logistics */}
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Truck className="h-4 w-4 text-ml-blue" aria-hidden="true" />
                Cliente, Destino & Logística
              </h3>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <User className="h-3 w-3" aria-hidden="true" />
                    ID do Cliente:
                  </dt>
                  <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                    {order.customer_id}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    Estado / UF:
                  </dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {order.state} ({order.state_code}) — {order.country}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">
                    Forma de Entrega:
                  </dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">
                    {order.delivery_method}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5 dark:border-slate-800">
                  <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    Data a caminho:
                  </dt>
                  <dd className="font-mono text-slate-800 dark:text-slate-200">
                    {order.is_canceled
                      ? 'Não enviado (Cancelado)'
                      : formatDateTimeBR(order.shipped_date)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    Data de entrega:
                  </dt>
                  <dd className="font-mono text-slate-800 dark:text-slate-200">
                    {order.is_canceled
                      ? 'Não entregue (Cancelado)'
                      : formatDateTimeBR(order.delivered_date)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">
                    Lead Time (Postagem / Trânsito / Total):
                  </dt>
                  <dd className="font-mono font-bold text-sky-700 dark:text-sky-300">
                    {order.is_canceled
                      ? 'Excluído (Cancelado)'
                      : `${formatDaysBR(order.dispatch_days)} / ${formatDaysBR(
                          order.transit_days,
                        )} / ${formatDaysBR(order.delivery_days)}`}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Section 4: Claims & Mediation */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex items-center gap-2">
              {order.has_open_claim || order.in_mediation ? (
                <ShieldAlert
                  className="h-4 w-4 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
              ) : order.has_closed_claim ? (
                <Scale
                  className="h-4 w-4 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
              )}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Histórico de Reclamações e Mediação:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Reclamação aberta: {order.has_open_claim ? 'Sim' : 'Não'}
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Reclamação encerrada: {order.has_closed_claim ? 'Sim' : 'Não'}
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Em mediação: {order.in_mediation ? 'Sim' : 'Não'}
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Pacote múltiplos itens:{' '}
                {order.is_bundle ? `Sim (${formatIntegerBR(order.units)})` : 'Não'}
              </span>
            </div>
          </section>

          {order.is_canceled && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <span>
                <strong>Nota de higienização analítica:</strong> Pedidos cancelados
                registram timestamps de envio e entrega idênticos à data da venda
                no CSV original do Mercado Livre (delta zero) e têm{' '}
                <code className="font-mono">Receita por produtos (BRL)</code>{' '}
                estornada em{' '}
                <code className="font-mono">Cancelamentos e reembolsos (BRL)</code>.
                Este registro é excluído automaticamente do cálculo de prazo médio de
                entrega e faturamento realizado.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
