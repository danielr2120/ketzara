import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ordersApi } from "../api";
import { OrdersTable } from "../components/OrdersTable";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Loading } from "../components/ui/Loading";
import { PageHeader } from "../components/ui/PageHeader";
import { useMeta } from "../context/MetaContext";
import { useAsync } from "../hooks/useAsync";
import { formatMoney, todayIso } from "../lib/format";

const PAGE_SIZE = 20;
const FILTER_KEYS = ["search", "status", "date_from", "date_to"] as const;

export function OrdersPage() {
  const { order_statuses } = useMeta();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const status = params.get("status") ?? "";
  const dateFrom = params.get("date_from") ?? "";
  const dateTo = params.get("date_to") ?? "";
  const page = Math.max(Number(params.get("page")) || 1, 1);

  const [searchInput, setSearchInput] = useState(search);

  function updateParams(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  }

  // Búsqueda con pequeña espera para no consultar en cada tecla.
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const t = setTimeout(() => updateParams({ search: searchInput.trim() }), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, error, loading, reload } = useAsync(
    () =>
      ordersApi.list({ search, status, date_from: dateFrom, date_to: dateTo, page, page_size: PAGE_SIZE }),
    [search, status, dateFrom, dateTo, page],
  );

  const hasFilters = FILTER_KEYS.some((k) => params.get(k));
  const totalPages = data ? Math.max(Math.ceil(data.total / data.page_size), 1) : 1;
  const today = todayIso();

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Consulta, busca y filtra los pedidos registrados."
        actions={
          <Link to="/orders/new" className="btn-primary">
            <Plus className="size-4" /> Nuevo pedido
          </Link>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="N.º de pedido, cliente o celular"
            aria-label="Buscar pedidos"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select className="input" aria-label="Filtrar por estado" value={status} onChange={(e) => updateParams({ status: e.target.value })}>
          <option value="">Todos los estados</option>
          {order_statuses.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input type="date" className="input" aria-label="Desde" title="Desde" value={dateFrom} max={dateTo || undefined} onChange={(e) => updateParams({ date_from: e.target.value })} />
        <input type="date" className="input" aria-label="Hasta" title="Hasta" value={dateTo} min={dateFrom || undefined} onChange={(e) => updateParams({ date_to: e.target.value })} />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button type="button" className="btn-secondary flex-1 whitespace-nowrap lg:flex-none" onClick={() => updateParams({ date_from: today, date_to: today })}>
            Hoy
          </button>
          {hasFilters && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setSearchInput("");
                setParams({}, { replace: true });
              }}
              title="Limpiar filtros"
            >
              <X className="size-4" /><span className="lg:sr-only">Limpiar</span>
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500">
              {data.total} pedido{data.total === 1 ? "" : "s"}
            </span>
            <span className="text-slate-500">
              Ventas (sin cancelados): <strong className="text-slate-900">{formatMoney(data.sales_total)}</strong>
            </span>
          </div>
        )}

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={hasFilters ? "No se encontraron pedidos" : "Aún no hay pedidos"}>
            {hasFilters ? "Prueba con otros filtros." : <Link to="/orders/new" className="text-indigo-600 hover:underline">Registrar el primer pedido</Link>}
          </EmptyState>
        ) : (
          <div className={loading ? "opacity-60 transition-opacity" : ""}>
            <OrdersTable orders={data.items} />
          </div>
        )}

        {data && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>
                <ChevronLeft className="size-4" /> Anterior
              </button>
              <button type="button" className="btn-secondary px-3 py-1.5" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) })}>
                Siguiente <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
