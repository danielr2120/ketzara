import type { ReactNode } from "react";

/** Marco de las páginas para clientes: sin menú ni acceso a la administración. */
export function PublicLayout({ children, className = "max-w-xl" }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-screen px-4 py-10">
      <div className={`mx-auto ${className}`}>
        <div className="mb-6 flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">Ketzara</span>
        </div>
        {children}
      </div>
    </div>
  );
}
