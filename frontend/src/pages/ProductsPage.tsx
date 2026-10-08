import { Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { productsApi } from "../api";
import { errorMessage } from "../api/client";
import { ProductFormModal } from "../components/ProductFormModal";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Loading } from "../components/ui/Loading";
import { PageHeader } from "../components/ui/PageHeader";
import { useAsync } from "../hooks/useAsync";
import { formatMoney } from "../lib/format";
import type { Product } from "../types";

export function ProductsPage() {
  const { data: products, error, loading, reload } = useAsync(() => productsApi.list(), []);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products ?? []).filter((p) => !term || p.name.toLowerCase().includes(term));
  }, [products, search]);

  async function toggleActive(product: Product) {
    setBusyId(product.id);
    setActionError(null);
    try {
      await productsApi.update(product.id, {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        active: !product.active,
      });
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo de productos disponibles para los pedidos."
        actions={
          <button type="button" className="btn-primary" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Nuevo producto
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar producto…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {actionError && <div className="p-4 pb-0"><ErrorAlert message={actionError} /></div>}

        {loading && !products ? (
          <Loading />
        ) : error ? (
          <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>
        ) : visible.length === 0 ? (
          <EmptyState title={search ? "No hay productos que coincidan" : "Aún no hay productos"}>
            {!search && "Crea tu primer producto para poder registrar pedidos."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => (
                  <tr key={p.id} className={p.active ? "" : "bg-slate-50/60 text-slate-500"}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      {p.description && <p className="line-clamp-1 max-w-md text-xs text-slate-500">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatMoney(p.price)}</td>
                    <td className="px-4 py-3 text-right">{p.stock ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${p.active ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-500 ring-slate-500/20"}`}>
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn-ghost px-2 py-1.5" onClick={() => setEditing(p)} title="Editar">
                          <Pencil className="size-4" /><span className="sr-only">Editar</span>
                        </button>
                        <button type="button" className="btn-ghost px-2 py-1.5 text-xs" disabled={busyId === p.id} onClick={() => toggleActive(p)}>
                          {p.active ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}
