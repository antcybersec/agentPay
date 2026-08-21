import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DecisionBadge, StatusBadge } from "@/components/ui/badge";
import { Select, TextInput } from "@/components/ui/controls";
import {
  EmptyState,
  ErrorState,
  Mono,
  PageHeader,
  Panel,
  SkeletonRows,
} from "@/components/ui/primitives";
import { DetailDrawer } from "@/components/detail-drawer";
import { IntentDetail } from "@/components/intent-detail";
import { formatDateTime, formatINR, shortId } from "@/lib/format";
import { useIntents, type IntentRow } from "@/lib/agentpay/hooks";

export const Route = createFileRoute("/intents")({
  head: () => ({
    meta: [
      { title: "Payment Intents — AgentPay" },
      {
        name: "description",
        content:
          "Every payment intent proposed by an AI agent with its deterministic policy decision, vendor, amount and settlement status.",
      },
      { property: "og:title", content: "Payment Intents — AgentPay" },
      {
        property: "og:description",
        content: "Full ledger of agent-proposed payments and their policy decisions.",
      },
    ],
  }),
  component: IntentsPage,
});

const DECISIONS = ["ALL", "ALLOW", "REQUIRE_HUMAN_APPROVAL", "BLOCK"];

function IntentsPage() {
  const { intents, isLoading, error } = useIntents();
  const [q, setQ] = useState("");
  const [decision, setDecision] = useState("ALL");
  const [selected, setSelected] = useState<IntentRow | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return intents.filter((i) => {
      if (decision !== "ALL" && i.decision !== decision) return false;
      if (!needle) return true;
      return [i.rawVendorName, i.purpose, i.agentName, i.category, i.id]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [intents, q, decision]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Payment Intents"
        subtitle="Every payment an agent proposed, and what the policy engine decided about it."
      />

      <Panel
        title={`${rows.length} intent${rows.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <TextInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search vendor, purpose, agent"
                className="w-56 pl-8"
              />
            </div>
            <Select value={decision} onChange={(e) => setDecision(e.target.value)}>
              {DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {d === "ALL" ? "All decisions" : d.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        {isLoading ? (
          <SkeletonRows rows={8} cols={7} />
        ) : error ? (
          <ErrorState error={error} />
        ) : rows.length === 0 ? (
          <EmptyState title="No matching payment intents" hint="Adjust the filters above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Created", "Intent", "Agent", "Vendor", "Category", "Amount", "Decision", "Status"].map(
                    (h) => (
                      <th key={h} className="label-xs px-4 py-2 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rows.map((row) => (
                  <tr key={row.id} className="row-hover cursor-pointer" onClick={() => setSelected(row)}>
                    <td className="num px-4 py-2.5 text-subtle">{formatDateTime(row.createdAt)}</td>
                    <td className="num px-4 py-2.5 text-subtle">{shortId(row.id, 12)}</td>
                    <td className="px-4 py-2.5">{row.agentName}</td>
                    <td className="px-4 py-2.5">{row.rawVendorName}</td>
                    <td className="num px-4 py-2.5 text-muted-foreground">{row.category}</td>
                    <td className="num px-4 py-2.5 tabular-nums">
                      {formatINR(row.amount, row.currency, false)}
                    </td>
                    <td className="px-4 py-2.5">
                      <DecisionBadge decision={row.decision} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Payment intent"
        subtitle={<Mono>{shortId(selected?.id, 22)}</Mono>}
      >
        {selected ? <IntentDetail intent={selected} /> : null}
      </DetailDrawer>
    </div>
  );
}
