import {
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Search,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, isActive: (p: string) => p === "/admin" },
  { to: "/admin/orders/new", label: "Nuevo pedido", icon: PlusCircle, isActive: (p: string) => p === "/admin/orders/new" },
  {
    to: "/admin/orders",
    label: "Pedidos",
    icon: ClipboardList,
    isActive: (p: string) => p.startsWith("/admin/orders") && p !== "/admin/orders/new",
  },
  { to: "/admin/consultar", label: "Consultar pedido", icon: Search, isActive: (p: string) => p === "/admin/consultar" },
  { to: "/admin/products", label: "Productos", icon: Package, isActive: (p: string) => p.startsWith("/admin/products") },
];

function Brand() {
  return (
    <Link to="/admin" className="flex items-center gap-2">
      <img src="/favicon.svg" alt="" className="size-8" />
      <span className="text-lg font-semibold tracking-tight text-slate-900">Ketzara</span>
    </Link>
  );
}

function NavItems({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex items-center gap-3 rounded-lg border-t border-slate-100 px-3 pt-4 pb-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <Store className="size-5" />
        Página para clientes
        <ExternalLink className="ml-auto size-4 text-slate-400" />
      </a>
    </nav>
  );
}

function Account() {
  const { session, logout } = useAuth();
  return (
    <div className="space-y-1 border-t border-slate-100 pt-4 text-sm">
      <p className="flex items-center gap-3 px-3 py-1 text-slate-500">
        <UserRound className="size-5 shrink-0" />
        <span className="truncate">{session?.username}</span>
      </p>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        onClick={logout}
      >
        <LogOut className="size-5" /> Cerrar sesión
      </button>
    </div>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="min-h-screen md:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r border-slate-200 bg-white p-4 md:flex">
        <Brand />
        <NavItems pathname={pathname} />
        <div className="mt-auto">
          <Account />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <button type="button" onClick={() => setMenuOpen((o) => !o)} className="btn-ghost px-2" aria-label="Menú">
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-x-0 top-[57px] z-20 space-y-4 border-b border-slate-200 bg-white p-4 shadow-lg md:hidden">
          <NavItems pathname={pathname} />
          <Account />
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
