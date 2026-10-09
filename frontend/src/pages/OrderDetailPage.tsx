import { ArrowLeft, Ban, Loader2, Pencil, Phone } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ordersApi } from "../api";
import { errorMessage } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { TrackingLink } from "../components/TrackingLink";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Loading } from "../components/ui/Loading";
import { Modal } from "../components/ui/Modal";
import { SuccessAlert } from "../components/ui/SuccessAlert";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime, formatMoney, formatPhone } from "../lib/format";

const CANCELLED = "cancelled";

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  );
}

export function OrderDetailPage() {
  const id = Number(useParams().id);
  const location = useLocation();
  const flash = (location.state as { flash?: string } | null)?.flash;
  const { order_statuses, paymentLabel, statusLabel } = useMeta();
  const { data: order, error, loading, reload, setData } = useAsync(() => ordersApi.get(id), [id]);

  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function changeStatus(status: string) {
    setSavingStatus(true);
    setActionError(null);
    setStatusMessage(null);
    try {
      const updated = await ordersApi.changeStatus(id, status);
      setData(updated);
      setStatusMessage(`Estado actualizado a «${statusLabel(updated.status)}»`);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSavingStatus(false);
      setConfirmCancel(false);
    }
  }

  if (loading && !order) return <Loading />;
  if (error || !order)
    return (
      <div className="space-y-4">
        <Link to="/admin/orders" className="btn-ghost -ml-3"><ArrowLeft className="size-4" /> Pedidos</Link>
        <ErrorAlert message={error ?? "Pedido no encontrado"} onRetry={reload} />
      </div>
    );

  const isCancelled = order.status === CANCELLED;

  return (
    <>
      <Link to="/admin/orders" className="btn-ghost mb-2 -ml-3"><ArrowLeft className="size-4" /> Pedidos</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{order.order_number}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">Creado el {formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isCancelled && (
            <>
              <Link to={`/admin/orders/${order.id}/edit`} className="btn-secondary"><Pencil className="size-4" /> Editar</Link>
              <button type="button" className="btn-danger" onClick={() => setConfirmCancel(true)}>
                <Ban className="size-4" /> Cancelar pedido
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 space-y-3">
        {flash && !statusMessage && <SuccessAlert message={flash} />}
        {statusMessage && <SuccessAlert message={statusMessage} />}
        {actionError && <ErrorAlert message={actionError} />}
        {isCancelled && (
          <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm text-slate-600">
            Este pedido está cancelado y no puede editarse. Puedes reactivarlo cambiando su estado.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-2 text-base font-semibold text-slate-900">Cliente</h2>
            <dl className="divide-y divide-slate-50">
              <InfoRow label="Nombre">{order.customer.name}</InfoRow>
              <InfoRow label="Celular">
                <a href={`tel:${order.customer.phone}`} className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                  <Phone className="size-3.5" /> {formatPhone(order.customer.phone)}
                </a>
              </InfoRow>
              <InfoRow label="Dirección">{order.shipping_address}</InfoRow>
              <InfoRow label="Ciudad">{order.shipping_city ?? "—"}</InfoRow>
              {order.customer.notes && <InfoRow label="Observaciones">{order.customer.notes}</InfoRow>}
            </dl>
          </section>

          <section className="card overflow-hidden">
            <h2 className="px-5 pt-5 pb-3 text-base font-semibold text-slate-900">Productos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-5 py-2.5">Producto</th>
                    <th className="px-5 py-2.5 text-right">Cant.</th>
                    <th className="px-5 py-2.5 text-right">Precio</th>
                    <th className="px-5 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3 font-medium text-slate-800">{item.product_name}</td>
                      <td className="px-5 py-3 text-right">{item.quantity}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">{formatMoney(item.unit_price)}</td>
                      <td className="px-5 py-3 text-right font-medium whitespace-nowrap">{formatMoney(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {order.notes && (
            <section className="card p-5">
              <h2 className="mb-2 text-base font-semibold text-slate-900">Observaciones del pedido</h2>
              <p className="text-sm whitespace-pre-line text-slate-700">{order.notes}</p>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <section className="card p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Estado</h2>
            <div className="flex items-center gap-2">
              <select
                className="input"
                aria-label="Cambiar estado"
                value={order.status}
                disabled={savingStatus}
                onChange={(e) => (e.target.value === CANCELLED ? setConfirmCancel(true) : changeStatus(e.target.value))}
              >
                {order_statuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {savingStatus && <Loader2 className="size-4 animate-spin text-slate-400" />}
            </div>
            <p className="mt-2 text-xs text-slate-500">Última actualización: {formatDateTime(order.updated_at)}</p>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-semibold text-slate-900">Enlace para el cliente</h2>
            <p className="mb-3 text-xs text-slate-500">Envíalo al cliente para que vea el estado de su pedido.</p>
            <TrackingLink code={order.tracking_code} />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Pago</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Método</dt><dd className="font-medium">{paymentLabel(order.payment_method)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatMoney(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Envío</dt><dd>{formatMoney(order.shipping_cost)}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold">{formatMoney(order.total)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <Modal
        open={confirmCancel}
        title="Cancelar pedido"
        onClose={() => setConfirmCancel(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setConfirmCancel(false)}>Volver</button>
            <button type="button" className="btn bg-red-600 text-white hover:bg-red-700" disabled={savingStatus} onClick={() => changeStatus(CANCELLED)}>
              {savingStatus && <Loader2 className="size-4 animate-spin" />}
              Sí, cancelar pedido
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          El pedido <strong>{order.order_number}</strong> quedará marcado como cancelado y dejará de contar en las ventas.
          No se elimina: podrás consultarlo o reactivarlo más adelante.
        </p>
      </Modal>
    </>
  );
}
