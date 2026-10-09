import { CheckCircle2, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ordersApi } from "../api";
import { OrderForm } from "../components/OrderForm";
import { StatusBadge } from "../components/StatusBadge";
import { TrackingLink } from "../components/TrackingLink";
import { PageHeader } from "../components/ui/PageHeader";
import { formatMoney, formatPhone } from "../lib/format";
import type { Order } from "../types";

export function NewOrderPage() {
  // Volver a entrar desde el menú (misma ruta) reinicia el formulario.
  const { key } = useLocation();
  return <NewOrderFlow key={key} />;
}

function NewOrderFlow() {
  const [created, setCreated] = useState<Order | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (created) {
    return (
      <OrderConfirmation
        order={created}
        onNew={() => {
          setCreated(null);
          setFormKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <>
      <PageHeader title="Nuevo pedido" description="Registra la venta. El número de pedido se genera automáticamente al guardar." />
      <OrderForm
        key={formKey}
        submitLabel="Guardar pedido"
        onSubmit={async (data) => {
          const order = await ordersApi.create(data);
          setCreated(order);
          window.scrollTo({ top: 0 });
        }}
      />
    </>
  );
}

function OrderConfirmation({ order, onNew }: { order: Order; onNew: () => void }) {
  const rows: [string, ReactNode][] = [
    ["Cliente", order.customer.name],
    ["Teléfono", formatPhone(order.customer.phone)],
    ["Dirección", [order.shipping_address, order.shipping_city].filter(Boolean).join(", ")],
  ];

  return (
    <div className="mx-auto max-w-lg">
      <div className="card overflow-hidden">
        <div className="flex flex-col items-center gap-2 bg-emerald-50 px-6 py-8 text-center">
          <CheckCircle2 className="size-10 text-emerald-600" />
          <h1 className="text-lg font-semibold text-emerald-800">Pedido creado correctamente</h1>
          <p className="text-3xl font-bold tracking-tight text-slate-900">{order.order_number}</p>
        </div>
        <div className="space-y-4 p-6 text-sm">
          <dl className="space-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 px-3 py-2">
                <span>
                  {item.product_name} <span className="text-slate-500">× {item.quantity}</span>
                </span>
                <span className="font-medium">{formatMoney(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2">
            {order.shipping_cost > 0 && (
              <div className="flex justify-between"><dt className="text-slate-500">Envío</dt><dd>{formatMoney(order.shipping_cost)}</dd></div>
            )}
            <div className="flex justify-between text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold">{formatMoney(order.total)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Estado</dt>
              <dd><StatusBadge status={order.status} /></dd>
            </div>
          </dl>
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 font-medium text-slate-700">Enlace de seguimiento para el cliente</p>
            <TrackingLink code={order.tracking_code} />
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
          <Link to={`/admin/orders/${order.id}`} className="btn-secondary">Ver pedido</Link>
          <button type="button" className="btn-primary" onClick={onNew}>
            <Plus className="size-4" /> Nuevo pedido
          </button>
        </div>
      </div>
    </div>
  );
}
