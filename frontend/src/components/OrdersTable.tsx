import { Link, useNavigate } from "react-router-dom";
import { useMeta } from "../context/MetaContext";
import { formatDate, formatDateTime, formatMoney, formatPhone } from "../lib/format";
import type { OrderSummary } from "../types";
import { StatusBadge } from "./StatusBadge";

export function OrdersTable({ orders }: { orders: OrderSummary[] }) {
  const navigate = useNavigate();
  const { paymentLabel } = useMeta();

  return (
    <>
      {/* Celular: tarjetas */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {orders.map((o) => (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{o.order_number}</p>
                <p className="truncate text-sm text-slate-700">{o.customer_name}</p>
                <p className="text-xs text-slate-500">{formatDateTime(o.created_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <p className="font-semibold text-slate-900">{formatMoney(o.total)}</p>
                <StatusBadge status={o.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Computador: tabla */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/orders/${o.id}`)}>
                <td className="px-4 py-3 font-semibold whitespace-nowrap text-slate-900">
                  <Link to={`/orders/${o.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-indigo-600">
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{o.customer_name}</p>
                  <p className="text-xs text-slate-500">{formatPhone(o.customer_phone)}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600" title={formatDateTime(o.created_at)}>
                  {formatDate(o.created_at)}
                </td>
                <td className="px-4 py-3 text-slate-600">{paymentLabel(o.payment_method)}</td>
                <td className="px-4 py-3 text-right font-medium whitespace-nowrap text-slate-900">{formatMoney(o.total)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
