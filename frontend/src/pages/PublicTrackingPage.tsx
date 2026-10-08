import { useParams } from "react-router-dom";
import { publicApi } from "../api";
import { OrderProgress } from "../components/OrderProgress";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Loading } from "../components/ui/Loading";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime, formatMoney } from "../lib/format";

/** Página que ve el cliente: sin menú ni acceso al resto de la aplicación. */
export function PublicTrackingPage() {
  const code = useParams().code ?? "";
  const { data: order, error, loading, reload } = useAsync(() => publicApi.trackOrder(code), [code]);

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">Ketzara</span>
        </div>

        {loading && !order ? (
          <Loading />
        ) : error || !order ? (
          <ErrorAlert message={error ?? "No se pudo cargar el pedido"} onRetry={reload} />
        ) : (
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 p-5">
              <p className="text-xs text-slate-500">Tu pedido</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900">{order.order_number}</p>
              <p className="text-sm text-slate-500">Realizado el {formatDateTime(order.created_at)}</p>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <p className="text-sm text-slate-500">Estado actual</p>
                <p className="text-xl font-semibold text-indigo-700">{order.status_label}</p>
                <p className="text-xs text-slate-400">Actualizado el {formatDateTime(order.updated_at)}</p>
              </div>
              {order.status === "cancelled" ? (
                <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">Este pedido fue cancelado.</p>
              ) : (
                <OrderProgress status={order.status} steps={order.steps} />
              )}
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-4 px-3 py-2">
                    <span>
                      {item.product_name} <span className="text-slate-500">× {item.quantity}</span>
                    </span>
                    <span className="font-medium">{formatMoney(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-1 text-sm">
                {order.shipping_cost > 0 && (
                  <div className="flex justify-between"><dt className="text-slate-500">Envío</dt><dd>{formatMoney(order.shipping_cost)}</dd></div>
                )}
                <div className="flex justify-between text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(order.total)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
