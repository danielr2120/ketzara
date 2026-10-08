import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Página no encontrada</h1>
      <Link to="/" className="btn-secondary mt-6">Volver al dashboard</Link>
    </div>
  );
}
