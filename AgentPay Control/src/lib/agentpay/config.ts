/**
 * Connection configuration for the existing AgentPay backend.
 *
 * Nothing secret is committed here. The base URL may come from a build-time
 * public env var; credentials are supplied by the operator at runtime and kept
 * in localStorage only (never in source, never sent anywhere but the API).
 */
const STORAGE_KEY = "agentpay.connection";

export type Connection = {
  baseUrl: string;
  adminKey: string;
  agentKey: string;
};

const envBase =
  (import.meta.env["VITE_AGENTPAY_API_URL"] as string | undefined) ?? "http://localhost:4000/api";

export const defaultConnection: Connection = {
  baseUrl: envBase,
  adminKey: "",
  agentKey: "",
};

let cached: Connection | null = null;
const listeners = new Set<(c: Connection) => void>();

export function getConnection(): Connection {
  if (cached) return cached;
  if (typeof window === "undefined") return defaultConnection;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cached = raw ? { ...defaultConnection, ...JSON.parse(raw) } : defaultConnection;
  } catch {
    cached = defaultConnection;
  }
  return cached ?? defaultConnection;
}

export function setConnection(next: Partial<Connection>) {
  const merged = { ...getConnection(), ...next };
  cached = merged;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* ignore quota / privacy mode */
  }
  listeners.forEach((l) => l(merged));
}

export function subscribeConnection(fn: (c: Connection) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
