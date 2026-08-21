import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DecisionBadge, StatusBadge } from "@/components/ui/badge";
import {
  EmptyState,
  ErrorState,
  Metric,
  PageHeader,
  Panel,
  Progress,
  SkeletonRows,
  Mono,
} from "@/components/ui/primitives";
import { DetailDrawer } from "@/components/detail-drawer";
import { IntentDetail } from "@/components/intent-detail";
import { compactINR, formatINR, formatTime, shortId } from "@/lib/format";
import { useIntents, useMetrics } from "@/lib/agentpay/hooks";
import type { IntentRow } from "@/lib/agentpay/hooks";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — AgentPay Control Plane" },
      {
        name: "description",
        content:
          "Monitor autonomous payment activity, policy decisions, approvals, and financial exposure across every AI agent.",
      },
      { property: "og:title", content: "Overview — AgentPay Control Plane" },
      {
        property: "og:description",
        content: "Live policy decisions, approvals and exposure for autonomous AI spending.",
      },
    ],
  }),
  component: Overview,
});

function Overview() {
  const metrics = useMetrics();
  const { intents, isLoading, error } = useIntents();
  const [selected, setSelected] = useState<IntentRow | null>(null);

  const m = metrics.data;
  const recent = intents.slice(0, 8);

  return (
    <div className="space-y-7">
      <PageHeader
        title="Payment Control Plane"
        subtitle="Monitor autonomous payment activity, policy decisions, approvals, and financial exposure."
      />

      {metrics.error ? (
        <ErrorState
          error={metrics.error}
          hint="Set the API base URL and keys from the connection control in the top bar."
        />
      ) : (
        <div className="grid grid-cols-2 border-y border-border lg:grid-cols-4">
          <Metric
            label="Daily budget"
            value={m ? compactINR(m.totalDailyBudget) : "—"}
            hint={
              m ? (
                <div className="space-y-1.5">
                  <Progress value={m.spentDaily} max={m.totalDailyBudget} />
                  <span className="num text-[11px]">
                    {compactINR(m.spentDaily)} spent today
                  </span>
                </div>
              ) : null
            }
          />
          <Metric
            label="Monthly spend"
            value={m ? compactINR(m.spentMonthly) : "—"}
            hint={
              m ? (
                <div className="space-y-1.5">
                  <Progress value={m.spentMonthly} max={m.totalMonthlyBudget} tone="allow" />
                  <span className="num text-[11px]">of {compactINR(m.totalMonthlyBudget)}</span>
                </div>
              ) : null
            }
          />
          <Metric
            label="Pending approvals"
            value={m ? m.pendingApprovals : "—"}
            tone={m && m.pendingApprovals > 0 ? "review" : "default"}
            hint={<Link to="/approvals" className="text-info hover:underline">Open approval queue →</Link>}
          />
          <Metric
            label="Blocked"
            value={m ? m.blockedTransactions : "—"}
            tone={m && m.blockedTransactions > 0 ? "block" : "default"}
            hint={m ? `${m.completedTransactions} completed · ${m.activeAgents}/${m.totalAgents} agents active` : null}
          />
        </div>
      )}

      <Panel
        title="Recent payment intents"
        description="Every intent produced by an agent, with the deterministic decision applied by the policy engine."
        actions={
          <Link to="/intents" className="text-[12.5px] text-info hover:underline">
            View all
          </Link>
        }
      >
        {isLoading ? (
          <SkeletonRows rows={6} cols={6} />
        ) : error ? (
          <ErrorState error={error} />
        ) : recent.length === 0 ? (
          <EmptyState
            title="No payment intents yet"
            hint="Run a scenario from the Agent Runtime page to produce a real intent through your backend."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Time", "Agent", "Vendor", "Purpose", "Amount", "Decision", "Status"].map((h) => (
                    <th key={h} className="label-xs px-4 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {recent.map((row) => (
                  <tr
                    key={row.id}
                    className="row-hover cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <td className="num px-4 py-2.5 text-subtle">{formatTime(row.createdAt)}</td>
                    <td className="px-4 py-2.5">{row.agentName}</td>
                    <td className="px-4 py-2.5">{row.rawVendorName}</td>
                    <td className="max-w-[260px] truncate px-4 py-2.5 text-muted-foreground">
                      {row.purpose}
                    </td>
                    <td className="num px-4 py-2.5 text-right tabular-nums">
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
