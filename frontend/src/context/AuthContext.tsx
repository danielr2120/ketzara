import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "../api";
import { clearSession, loadSession, saveSession, SESSION_EXPIRED_EVENT, type Session } from "../api/session";

interface AuthContextValue {
  session: Session | null;
  /** true si se volvió al inicio de sesión porque la sesión anterior dejó de ser válida. */
  expired: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const onExpired = () => {
      setSession((current) => {
        if (current) setExpired(true);
        return null;
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const next = { token: res.access_token, username: res.username, expires_at: res.expires_at };
    saveSession(next);
    setSession(next);
    setExpired(false);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setExpired(false);
  }, []);

  return <AuthContext.Provider value={{ session, expired, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
