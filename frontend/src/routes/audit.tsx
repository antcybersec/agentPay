import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DecisionBadge, EventBadge } from "@/components/ui/badge";
import { Select, TextInput } from "@/components/ui/controls";
import {
  EmptyState,
  ErrorState,
  Mono,
  PageHeader,
  Panel,
  SkeletonRows,
} from "@/components/ui/primitives";
import { formatDateTime, formatINR, shortId } from "@/lib/format";
import { useAuditEvents } from "@/lib/agentpay/hooks";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — AgentPay" },
      {
        name: "description",
        content:
          "Immutable ledger of every agent request, policy evaluation, human decision and settlement event recorded by AgentPay.",
      },
      { property: "og:title", content: "Audit Log — AgentPay" },
      {
        property: "og:description",
        content: "An append-only record of every decision the control plane made.",
      },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { data, isLoading, error } = useAuditEvents();
  const [q, setQ] = useState("");
  const [type, setType] = useState("ALL");

  const events = useMemo(
    () => [...(data ?? [])].sort((a, b) => String(b?.timestamp || "").localeCompare(String(a?.timestamp || ""))),
    [data],
  );
  const types = useMemo(
    () => ["ALL", ...Array.from(new Set(events.map((e) => e.eventType)))],
    [events],
  );
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return events.filter((e) => {
      if (type !== "ALL" && e.eventType !== type) return false;
      if (!needle) return true;
      return `${e.reason} ${e.agent?.name ?? ""} ${e.paymentIntent?.rawVendorName ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [events, q, type]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Audit Log"
        subtitle="Append-only record of every event the control plane emitted, in reverse chronological order."
      />

      <Panel
        title={`${rows.length} event${rows.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <TextInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search reason, agent, vendor"
                className="w-60 pl-8"
              />
            </div>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t === "ALL" ? "All event types" : t}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        {isLoading ? (
          <SkeletonRows rows={10} cols={5} />
        ) : error ? (
          <ErrorState error={error} />
        ) : rows.length === 0 ? (
          <EmptyState title="No audit events" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Timestamp", "Event", "Agent", "Reason", "Decision", "Amount", "Intent"].map((h) => (
                    <th key={h} className="label-xs px-4 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rows.map((e) => (
                  <tr key={e.id} className="row-hover">
                    <td className="num whitespace-nowrap px-4 py-2.5 text-subtle">
                      {formatDateTime(e.timestamp)}
                    </td>
                    <td className="px-4 py-2.5">
                      <EventBadge eventType={e.eventType} />
                    </td>
                    <td className="px-4 py-2.5">{e.agent?.name ?? shortId(e.agentId, 10)}</td>
                    <td className="max-w-[340px] truncate px-4 py-2.5 text-muted-foreground">
                      {e.reason}
                    </td>
                    <td className="px-4 py-2.5">
                      {e.decision ? <DecisionBadge decision={e.decision} /> : <span className="text-subtle">—</span>}
                    </td>
                    <td className="num px-4 py-2.5 tabular-nums">
                      {e.paymentIntent
                        ? formatINR(e.paymentIntent.amount, e.paymentIntent.currency, false)
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Mono className="text-[11px] text-subtle">
                        {shortId(e.paymentIntentId, 10)}
                      </Mono>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
