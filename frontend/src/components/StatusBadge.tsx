import { useMeta } from "../context/MetaContext";

const STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  preparing: "bg-violet-50 text-violet-700 ring-violet-600/20",
  shipped: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-500/20 line-through",
};

const DEFAULT_STYLE = "bg-slate-50 text-slate-700 ring-slate-600/20";

export function StatusBadge({ status }: { status: string }) {
  const { statusLabel } = useMeta();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${STYLES[status] ?? DEFAULT_STYLE}`}>
      {statusLabel(status)}
    </span>
  );
}
