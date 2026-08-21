export function formatINR(amount: number, currency = "INR", withDecimals = true) {
  const n = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(amount ?? 0);
  return currency === "INR" ? `₹${n}` : `${n} ${currency}`;
}

export function compactINR(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount ?? 0)}`;
}

export function shortId(id?: string | null, head = 10) {
  if (!id) return "—";
  return id.length > head + 3 ? `${id.slice(0, head)}…` : id;
}

export function formatTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-CA")} ${d.toLocaleTimeString("en-GB", { hour12: false })}`;
}

export function relativeTime(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function safeJson(value?: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
