import { getConnection } from "./config";
import type {
  Agent,
  AuditEvent,
  DashboardMetrics,
  PaymentIntent,
  ScenarioResult,
  Vendor,
} from "./types";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type Auth = "none" | "admin" | "agent" | "either";

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: Auth } = {},
): Promise<T> {
  const { baseUrl, adminKey, agentKey } = getConnection();
  const auth: Auth = opts.auth ?? "none";
  const headers: Record<string, string> = {};

  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if ((auth === "admin" || auth === "either") && adminKey) {
    headers["Authorization"] = `Bearer ${adminKey}`;
  }
  if ((auth === "agent" || auth === "either") && agentKey) {
    headers["x-agent-api-key"] = agentKey;
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? null : JSON.stringify(opts.body),
    });
  } catch (err) {
    throw new ApiError(
      `Cannot reach the AgentPay API at ${baseUrl}. Check the base URL and that the backend is running.`,
      0,
      err,
    );
  }

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || (json && json.success === false)) {
    throw new ApiError(json?.error ?? `HTTP ${res.status}`, res.status, json ?? text);
  }
  return (json?.data ?? json) as T;
}

/** Raw request that returns the full envelope (used by the security console). */
export async function rawRequest(
  path: string,
  opts: { method?: string; body?: unknown; auth?: Auth } = {},
): Promise<{ status: number; body: unknown }> {
  const { baseUrl, adminKey, agentKey } = getConnection();
  const auth: Auth = opts.auth ?? "none";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if ((auth === "admin" || auth === "either") && adminKey) headers["Authorization"] = `Bearer ${adminKey}`;
  if ((auth === "agent" || auth === "either") && agentKey) headers["x-agent-api-key"] = agentKey;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method: opts.method ?? "POST",
    headers,
    body: opts.body === undefined ? null : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep text */
  }
  return { status: res.status, body };
}

export const api = {
  metrics: () => request<DashboardMetrics>("/dashboard/metrics", { auth: "either" }),
  agents: () => request<Agent[]>("/agents", { auth: "either" }),
  vendors: () => request<Vendor[]>("/vendors"),
  auditEvents: () => request<AuditEvent[]>("/audit-events", { auth: "either" }),

  approveIntent: (id: string) =>
    request<unknown>(`/payment-intents/${id}/approve`, { method: "POST", auth: "admin" }),
  rejectIntent: (id: string, reason?: string) =>
    request<PaymentIntent>(`/payment-intents/${id}/reject`, {
      method: "POST",
      auth: "admin",
      body: { reason },
    }),
  createOrder: (id: string) =>
    request<{ razorpayOrderId: string }>(`/payment-intents/${id}/create-order`, {
      method: "POST",
      auth: "either",
    }),
  updatePolicy: (
    agentId: string,
    body: { autoApproveLimit?: number; humanApprovalLimit?: number; hardMaximum?: number },
  ) => request<unknown>(`/agent-policy/${agentId}`, { method: "PUT", auth: "admin", body }),
  setAgentStatus: (id: string, status: string) =>
    request<Agent>(`/agents/${id}/status`, { method: "PUT", auth: "admin", body: { status } }),

  runScenario: (body: { scenario?: "A" | "B" | "C"; prompt?: string }) =>
    request<ScenarioResult>("/agent/run-scenario", { method: "POST", auth: "agent", body }),
  requestPayment: (body: Record<string, unknown>) =>
    request<unknown>("/agent/request-payment", { method: "POST", auth: "agent", body }),
  securitySimulation: (attackType: string) =>
    rawRequest("/test/security-simulation", { body: { attackType }, auth: "either" }),
  triggerWebhook: (razorpayOrderId: string, event = "payment.captured") =>
    request<unknown>("/test/trigger-webhook", {
      method: "POST",
      auth: "either",
      body: { razorpayOrderId, event },
    }),
};
