import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "./client";
import { getConnection, subscribeConnection, type Connection } from "./config";
import type { AuditEvent, PaymentIntent } from "./types";

export function useConnection(): Connection {
  const [conn, setConn] = useState<Connection>(() => getConnection());
  useEffect(() => {
    setConn(getConnection());
    const unsub = subscribeConnection(setConn);
    return () => {
      unsub();
    };
  }, []);
  return conn;
}

const common = { staleTime: 5_000, retry: false } as const;

export function useMetrics() {
  return useQuery({ queryKey: ["metrics"], queryFn: api.metrics, ...common });
}
export function useAgents() {
  return useQuery({ queryKey: ["agents"], queryFn: api.agents, ...common });
}
export function useVendors() {
  return useQuery({ queryKey: ["vendors"], queryFn: api.vendors, ...common });
}
export function useAuditEvents() {
  return useQuery({ queryKey: ["audit-events"], queryFn: api.auditEvents, ...common });
}

export type IntentRow = PaymentIntent & {
  agentName: string;
  events: AuditEvent[];
  lastEventAt: string;
};

/**
 * The backend exposes PaymentIntents through the audit ledger
 * (GET /api/audit-events includes the related paymentIntent + agent).
 * We project that real data into an intent list — nothing is fabricated.
 */
export function useIntents() {
  const query = useAuditEvents();
  const intents = useMemo<IntentRow[]>(() => {
    const events = query.data ?? [];
    const map = new Map<string, IntentRow>();
    for (const ev of events) {
      const pi = ev.paymentIntent;
      if (!pi) continue;
      const existing = map.get(pi.id);
      if (existing) {
        existing.events.push(ev);
        if (ev.timestamp > existing.lastEventAt) existing.lastEventAt = ev.timestamp;
      } else {
        map.set(pi.id, {
          ...pi,
          agentName: ev.agent?.name ?? pi.agentId,
          events: [ev],
          lastEventAt: ev.timestamp,
        });
      }
    }
    const rows = [...map.values()];
    rows.forEach((r) => r.events.sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return rows;
  }, [query.data]);

  return { ...query, intents };
}

export function useRefreshAll() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["metrics"] });
    void qc.invalidateQueries({ queryKey: ["agents"] });
    void qc.invalidateQueries({ queryKey: ["audit-events"] });
    void qc.invalidateQueries({ queryKey: ["vendors"] });
  };
}

export function useApprove() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (id: string) => api.approveIntent(id),
    onSuccess: refresh,
  });
}

export function useReject() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.rejectIntent(id, reason),
    onSuccess: refresh,
  });
}
