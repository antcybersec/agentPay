import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { DecisionBadge, StatusBadge } from "@/components/ui/badge";
import { Btn, TextInput } from "@/components/ui/controls";
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
import { formatDateTime, formatINR, relativeTime, shortId } from "@/lib/format";
import { useApprove, useIntents, useReject, type IntentRow } from "@/lib/agentpay/hooks";

export const Route = createFileRoute("/approvals")({
  head: () => ({
    meta: [
      { title: "Approval Queue — AgentPay" },
      {
        name: "description",
        content:
          "Human approval queue for agent payments that exceeded the auto-approval threshold. Approve or reject with a full audit trail.",
      },
      { property: "og:title", content: "Approval Queue — AgentPay" },
      {
        property: "og:description",
        content: "AI proposes. AgentPay decides. Humans confirm the high-value calls.",
      },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { intents, isLoading, error } = useIntents();
  const approve = useApprove();
  const reject = useReject();
  const [selected, setSelected] = useState<IntentRow | null>(null);
  const [reason, setReason] = useState("");

  const pending = useMemo(
    () =>
      intents.filter(
        (i) =>
          i.status === "PENDING_HUMAN_APPROVAL" || i.decision === "REQUIRE_HUMAN_APPROVAL",
      ),
    [intents],
  );
  const queue = pending.filter((i) => i.status === "PENDING_HUMAN_APPROVAL");
  const resolved = pending.filter((i) => i.status !== "PENDING_HUMAN_APPROVAL");

  const busy = approve.isPending || reject.isPending;

  function onApprove(row: IntentRow) {
    approve.mutate(row.id, {
      onSuccess: () => toast.success(`Approved ${formatINR(row.amount, row.currency, false)} to ${row.rawVendorName}`),
      onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Approval failed"),
    });
  }

  function onReject(row: IntentRow) {
    reject.mutate(
      reason.trim() ? { id: row.id, reason: reason.trim() } : { id: row.id },
      {
        onSuccess: () => {
          setReason("");
          toast.success(`Rejected intent ${shortId(row.id, 10)}`);
        },
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Rejection failed"),
      },
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Approval Queue"
        subtitle="Payments the policy engine escalated to a human. AI proposes, AgentPay decides, you confirm."
      />

      <Panel title={`Awaiting decision · ${queue.length}`}>
        {isLoading ? (
          <SkeletonRows rows={3} cols={5} />
        ) : error ? (
          <ErrorState error={error} />
        ) : queue.length === 0 ? (
          <EmptyState
            title="Queue is clear"
            hint="No agent payment is currently waiting on a human decision."
          />
        ) : (
          <ul className="divide-y divide-border">
            {queue.map((row) => (
              <li key={row.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num text-[20px] font-medium tabular-nums">
                        {formatINR(row.amount, row.currency, false)}
                      </span>
                      <DecisionBadge decision={row.decision} />
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="mt-1.5 text-[13px] text-foreground">
                      {row.rawVendorName} · <span className="text-muted-foreground">{row.purpose}</span>
                    </p>
                    <p className="num mt-1 text-[11.5px] text-subtle">
                      {row.agentName} · {row.category} · requested {relativeTime(row.createdAt)} ·{" "}
                      {shortId(row.id, 12)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TextInput
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Rejection reason (optional)"
                      className="w-56"
                    />
                    <Btn variant="ghost" size="sm" onClick={() => setSelected(row)}>
                      Inspect
                    </Btn>
                    <Btn
                      variant="block"
                      size="sm"
                      disabled={busy}
                      onClick={() => onReject(row)}
                    >
                      <X className="size-3.5" /> Reject
                    </Btn>
                    <Btn size="sm" disabled={busy} onClick={() => onApprove(row)}>
                      <Check className="size-3.5" /> Approve
                    </Btn>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Previously escalated" description="Escalations already resolved by a human.">
        {resolved.length === 0 ? (
          <EmptyState title="Nothing resolved yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Requested", "Agent", "Vendor", "Amount", "Status"].map((h) => (
                    <th key={h} className="label-xs px-4 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {resolved.map((row) => (
                  <tr key={row.id} className="row-hover cursor-pointer" onClick={() => setSelected(row)}>
                    <td className="num px-4 py-2.5 text-subtle">{formatDateTime(row.createdAt)}</td>
                    <td className="px-4 py-2.5">{row.agentName}</td>
                    <td className="px-4 py-2.5">{row.rawVendorName}</td>
                    <td className="num px-4 py-2.5 tabular-nums">
                      {formatINR(row.amount, row.currency, false)}
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
