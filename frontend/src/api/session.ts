const SESSION_KEY = "ketzara_session";

/** Se emite cuando la API rechaza la sesión (expiró, cambió la contraseña o se cerró en otra pestaña). */
export const SESSION_EXPIRED_EVENT = "ketzara:session-expired";

export interface Session {
  token: string;
  username: string;
  expires_at: string;
}

export function loadSession(): Session | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as Session | null;
    if (session?.token && new Date(session.expires_at) > new Date()) return session;
  } catch {
    // Valor corrupto: se descarta.
  }
  localStorage.removeItem(SESSION_KEY);
  return null;
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
