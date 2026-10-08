import { Loader2, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ordersApi } from "../api";
import { OrderProgress } from "../components/OrderProgress";
import { StatusBadge } from "../components/StatusBadge";
import { TrackingLink } from "../components/TrackingLink";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { PageHeader } from "../components/ui/PageHeader";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime, formatMoney } from "../lib/format";
import type { Order } from "../types";

function OrderStatusCard({ order }: { order: Order }) {
  const { order_statuses } = useMeta();
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <p className="text-xs text-slate-500">Pedido</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900">{order.order_number}</p>
          <p className="text-sm text-slate-500">Realizado el {formatDateTime(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="space-y-5 p-5">
        {order.status === "cancelled" ? (
          <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">Este pedido fue cancelado.</p>
        ) : (
          <OrderProgress status={order.status} steps={order_statuses} />
        )}
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 px-3 py-2">
              <span>
                {item.product_name} <span className="text-slate-500">× {item.quantity}</span>
              </span>
              <span className="font-medium">{formatMoney(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Enlace para el cliente</p>
          <TrackingLink code={order.tracking_code} />
        </div>
      </div>
    </div>
  );
}

export function TrackOrderPage() {
  const [params, setParams] = useSearchParams();
  const number = params.get("pedido") ?? "";
  const [input, setInput] = useState(number);

  const { data: order, error, loading } = useAsync(
    () => (number ? ordersApi.getByNumber(number) : Promise.resolve(null)),
    [number],
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = input.trim();
    setParams(value ? { pedido: value } : {}, { replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Consultar pedido" description="Escribe el número de pedido para ver en qué estado está." />

      <form onSubmit={handleSubmit} className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Ej.: PED-000157"
            aria-label="Número de pedido"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary" disabled={!input.trim()}>
          {loading && number ? <Loader2 className="size-4 animate-spin" /> : null}
          Consultar
        </button>
      </form>

      {number && !loading && error && <ErrorAlert message={error} />}
      {number && !loading && order && <OrderStatusCard order={order} />}
    </div>
  );
}
