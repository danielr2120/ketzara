import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, type Location } from "react-router-dom";
import { errorMessage } from "../api/client";
import { PublicLayout } from "../components/PublicLayout";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Field, inputClass } from "../components/ui/Field";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { session, expired, login } = useAuth();
  const from = (useLocation().state as { from?: Location } | null)?.from;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to={from ? `${from.pathname}${from.search}` : "/admin"} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Escribe tu usuario y contraseña.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout className="max-w-sm">
      <form onSubmit={handleSubmit} noValidate className="card space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Iniciar sesión</h1>
          <p className="text-sm text-slate-500">Acceso a la administración de pedidos.</p>
        </div>
        {error ? (
          <ErrorAlert message={error} />
        ) : (
          expired && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Tu sesión expiró. Inicia sesión de nuevo.</p>
          )
        )}
        <Field label="Usuario" htmlFor="login-user">
          <input id="login-user" autoComplete="username" autoCapitalize="none" autoFocus className={inputClass()} value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Contraseña" htmlFor="login-password">
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={`${inputClass()} pr-10`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Entrar
        </button>
      </form>
    </PublicLayout>
  );
}
