import { Badge, DecisionBadge, EventBadge, StatusBadge } from "@/components/ui/badge";
import { KeyValue, Mono, Panel } from "@/components/ui/primitives";
import { PolicyCheckList, buildChecks } from "@/components/policy-check";
import { formatDateTime, formatINR, safeJson } from "@/lib/format";
import { useAgents, useVendors, type IntentRow } from "@/lib/agentpay/hooks";

export function IntentDetail({ intent }: { intent: IntentRow }) {
  const { data: agents } = useAgents();
  const { data: vendors } = useVendors();
  const agent = agents?.find((a) => a.id === intent.agentId);
  const checks = buildChecks(intent, agent, vendors ?? []);
  const policyEvent = intent.events.find((e) => e.eventType === "POLICY_EVALUATED");
  const meta = safeJson(policyEvent?.metadata) as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="num text-[30px] font-medium leading-none tracking-[-0.02em]">
            {formatINR(intent.amount, intent.currency)}
          </div>
          <div className="label-xs mt-2">{intent.currency}</div>
        </div>
        <div className="flex items-center gap-2">
          <DecisionBadge decision={intent.decision} />
          <StatusBadge status={intent.status} />
        </div>
      </div>

      <Panel title="Request details" bodyClassName="px-4 py-1">
        <KeyValue label="Agent">{intent.agentName}</KeyValue>
        <KeyValue label="Agent ID">
          <Mono>{intent.agentId}</Mono>
        </KeyValue>
        <KeyValue label="Vendor">{intent.rawVendorName}</KeyValue>
        <KeyValue label="Category">
          <Mono>{intent.category}</Mono>
        </KeyValue>
        <KeyValue label="Purpose">{intent.purpose}</KeyValue>
        <KeyValue label="Created">
          <Mono>{formatDateTime(intent.createdAt)}</Mono>
        </KeyValue>
      </Panel>

      <Panel
        title="Policy evaluation"
        description={policyEvent?.reason ?? "Evaluated by the deterministic backend engine"}
        bodyClassName="px-4 py-1"
      >
        <PolicyCheckList checks={checks} />
      </Panel>

      <Panel title="Decision" bodyClassName="flex items-center justify-between gap-4 px-4 py-4">
        <div>
          <DecisionBadge decision={intent.decision} />
          {meta && typeof meta["ruleTriggered"] === "string" ? (
            <div className="num mt-2 text-[11.5px] text-muted-foreground">
              RULE · {meta["ruleTriggered"] as string}
            </div>
          ) : null}
        </div>
        {intent.rejectionReason ? (
          <div className="max-w-[55%] text-right text-xs text-muted-foreground">
            {intent.rejectionReason}
          </div>
        ) : null}
      </Panel>

      <Panel title="Payment" bodyClassName="px-4 py-1">
        <KeyValue label="Razorpay order">
          {intent.razorpayOrderId ? <Mono>{intent.razorpayOrderId}</Mono> : <span className="text-subtle">Not created</span>}
        </KeyValue>
        <KeyValue label="Razorpay payment">
          {intent.razorpayPaymentId ? <Mono>{intent.razorpayPaymentId}</Mono> : <span className="text-subtle">—</span>}
        </KeyValue>
        <KeyValue label="Status">
          <StatusBadge status={intent.status} />
        </KeyValue>
      </Panel>

      <Panel title="Audit history" bodyClassName="px-4 py-3">
        <ol className="relative space-y-3 border-l border-border pl-4">
          {intent.events.map((ev) => (
            <li key={ev.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 size-1.5 rounded-full bg-border-strong" />
              <div className="flex flex-wrap items-center gap-2">
                <EventBadge eventType={ev.eventType} />
                <Mono className="text-[11px] text-subtle">{formatDateTime(ev.timestamp)}</Mono>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{ev.reason}</p>
            </li>
          ))}
          {intent.events.length === 0 ? (
            <li className="text-xs text-muted-foreground">No audit events.</li>
          ) : null}
        </ol>
      </Panel>

      <Panel title="Payment intent id" bodyClassName="px-4 py-3">
        <Badge tone="info">
          <span className="normal-case">{intent.id}</span>
        </Badge>
      </Panel>
    </div>
  );
}
