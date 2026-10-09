import { clearSession, loadSession, SESSION_EXPIRED_EVENT } from "./session";

const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) || "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
  query?: Record<string, QueryValue>;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_URL}${path}${qs ? `?${qs}` : ""}`;
}

const UNEXPECTED_FORMAT = "El servidor respondió en un formato inesperado. Revisa la URL de la API.";

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const token = loadSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Verifica tu conexión.", 0);
  }

  // En /auth/login un 401 solo significa credenciales incorrectas.
  if (response.status === 401 && !path.startsWith("/auth/")) {
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      typeof data?.detail === "string" ? data.detail : "Ocurrió un error inesperado. Intenta nuevamente.";
    const fieldErrors: Record<string, string> = {};
    if (Array.isArray(data?.errors)) {
      for (const err of data.errors as { field: string; message: string }[]) {
        if (err.field && !fieldErrors[err.field]) fieldErrors[err.field] = err.message;
      }
    }
    throw new ApiError(message, response.status, fieldErrors);
  }
  return response;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  const data = await response.json().catch(() => null);
  if (data === null) {
    // Ocurre cuando VITE_API_URL no apunta al backend y se recibe el index.html del frontend.
    throw new ApiError(UNEXPECTED_FORMAT, response.status);
  }
  return data as T;
}

/** Descarga un archivo generado por la API (por ejemplo, un Excel). */
export async function requestFile(path: string, query?: Record<string, QueryValue>): Promise<Blob> {
  const response = await send(path, { query });
  if (response.headers.get("Content-Type")?.includes("text/html")) {
    throw new ApiError(UNEXPECTED_FORMAT, response.status);
  }
  return response.blob();
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Ocurrió un error inesperado. Intenta nuevamente.";
}
