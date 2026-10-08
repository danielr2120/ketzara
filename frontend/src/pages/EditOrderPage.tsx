import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ordersApi } from "../api";
import { OrderForm } from "../components/OrderForm";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Loading } from "../components/ui/Loading";
import { PageHeader } from "../components/ui/PageHeader";
import { useAsync } from "../hooks/useAsync";

export function EditOrderPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { data: order, error, loading, reload } = useAsync(() => ordersApi.get(id), [id]);

  if (loading && !order) return <Loading />;
  if (error || !order) return <ErrorAlert message={error ?? "Pedido no encontrado"} onRetry={reload} />;
  if (order.status === "cancelled") return <Navigate to={`/orders/${id}`} replace />;

  return (
    <>
      <Link to={`/orders/${id}`} className="btn-ghost mb-2 -ml-3"><ArrowLeft className="size-4" /> Volver al pedido</Link>
      <PageHeader title={`Editar ${order.order_number}`} description="Los totales se recalculan al guardar." />
      <OrderForm
        initial={order}
        submitLabel="Guardar cambios"
        onSubmit={async (data) => {
          await ordersApi.update(id, data);
          navigate(`/orders/${id}`, { state: { flash: "Pedido actualizado correctamente" } });
        }}
      />
    </>
  );
}
