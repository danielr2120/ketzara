import { createContext, useContext, type ReactNode } from "react";
import { metaApi } from "../api";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Loading } from "../components/ui/Loading";
import { useAsync } from "../hooks/useAsync";
import type { Meta, Option } from "../types";

interface MetaContextValue extends Meta {
  paymentLabel: (value: string) => string;
  statusLabel: (value: string) => string;
}

const MetaContext = createContext<MetaContextValue | null>(null);

function labelFor(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/** Carga los catálogos (métodos de pago y estados) definidos en el backend. */
export function MetaProvider({ children }: { children: ReactNode }) {
  const { data, error, loading, reload } = useAsync(() => metaApi.get(), []);

  if (loading && !data) return <Loading className="h-screen" />;
  if (error || !data)
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorAlert message={error ?? "No se pudo cargar la configuración"} onRetry={reload} />
      </div>
    );

  const value: MetaContextValue = {
    ...data,
    paymentLabel: (v) => labelFor(data.payment_methods, v),
    statusLabel: (v) => labelFor(data.order_statuses, v),
  };
  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export function useMeta(): MetaContextValue {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error("useMeta debe usarse dentro de MetaProvider");
  return ctx;
}
