import { Loader2 } from "lucide-react";

export function Loading({ className = "py-16", label = "Cargando…" }: { className?: string; label?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 text-sm text-slate-500 ${className}`}>
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}
