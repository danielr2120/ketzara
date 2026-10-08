import { Check } from "lucide-react";
import type { Option } from "../types";

/** Pasos del pedido (Pendiente → Entregado) resaltando el estado actual. */
export function OrderProgress({ status, steps }: { status: string; steps: Option[] }) {
  const visible = steps.filter((s) => s.value !== "cancelled");
  const current = visible.findIndex((s) => s.value === status);
  return (
    <ol className="grid gap-3 sm:grid-cols-5">
      {visible.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step.value} className="flex items-center gap-2 sm:flex-col sm:text-center">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={`text-sm ${i === current ? "font-semibold text-slate-900" : done ? "text-slate-700" : "text-slate-400"}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
