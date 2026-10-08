import { CalendarDays, CheckCircle2, Clock, DollarSign, Plus, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../api";
import { OrdersTable } from "../components/OrdersTable";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Loading } from "../components/ui/Loading";
import { PageHeader } from "../components/ui/PageHeader";
import { useAsync } from "../hooks/useAsync";
import { formatMoney, todayIso } from "../lib/format";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  to?: string;
}

function StatCard({ label, value, icon: Icon, tone, to }: StatCardProps) {
  const content = (
    <div className="card flex h-full items-center gap-4 p-4 transition-colors hover:border-slate-300">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="truncate text-xl font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export function DashboardPage() {
  const { data, error, loading, reload } = useAsync(() => dashboardApi.summary(), []);
  const today = todayIso();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumen de la operación de hoy y del mes."
        actions={
          <Link to="/orders/new" className="btn-primary">
            <Plus className="size-4" /> Nuevo pedido
          </Link>
        }
      />

      {loading && !data ? (
        <Loading />
      ) : error || !data ? (
        <ErrorAlert message={error ?? "No se pudo cargar el resumen"} onRetry={reload} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Pedidos de hoy" value={data.orders_today} icon={CalendarDays} tone="bg-indigo-50 text-indigo-600" to={`/orders?date_from=${today}&date_to=${today}`} />
            <StatCard label="Pendientes" value={data.pending_orders} icon={Clock} tone="bg-amber-50 text-amber-600" to="/orders?status=pending" />
            <StatCard label="Entregados (mes)" value={data.delivered_this_month} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
            <StatCard label="Ventas del día" value={formatMoney(data.sales_today)} icon={DollarSign} tone="bg-sky-50 text-sky-600" />
            <StatCard label="Ventas del mes" value={formatMoney(data.sales_this_month)} icon={TrendingUp} tone="bg-violet-50 text-violet-600" />
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Últimos pedidos</h2>
              <Link to="/orders" className="text-sm font-medium text-indigo-600 hover:underline">Ver todos</Link>
            </div>
            {data.recent_orders.length === 0 ? (
              <EmptyState title="Aún no hay pedidos">
                <Link to="/orders/new" className="text-indigo-600 hover:underline">Registrar el primer pedido</Link>
              </EmptyState>
            ) : (
              <OrdersTable orders={data.recent_orders} />
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">Las ventas no incluyen pedidos cancelados.</p>
        </>
      )}
    </>
  );
}
