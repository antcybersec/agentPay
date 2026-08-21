import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Btn, Field, TextInput } from "@/components/ui/controls";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  SkeletonRows,
} from "@/components/ui/primitives";
import { formatINR, safeJson } from "@/lib/format";
import { api } from "@/lib/agentpay/client";
import { useAgents, useRefreshAll } from "@/lib/agentpay/hooks";
import type { Agent } from "@/lib/agentpay/types";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Policies — AgentPay" },
      {
        name: "description",
        content:
          "Deterministic spending policy per agent: auto-approval threshold, human approval band, hard maximum and category rules.",
      },
      { property: "og:title", content: "Policies — AgentPay" },
      {
        property: "og:description",
        content: "The rules that turn agent intent into an allowed, escalated or blocked payment.",
      },
    ],
  }),
  component: PoliciesPage,
});

function PoliciesPage() {
  const { data, isLoading, error } = useAgents();

  return (
    <div className="space-y-7">
      <PageHeader
        title="Policies"
        subtitle="Deterministic thresholds evaluated on every payment intent. Amounts are evaluated in order: auto-approve, human approval, hard maximum."
      />

      {isLoading ? (
        <Panel>
          <SkeletonRows rows={4} cols={4} />
        </Panel>
      ) : error ? (
        <ErrorState error={error} />
      ) : !data || data.length === 0 ? (
        <Panel>
          <EmptyState title="No agents with policies" />
        </Panel>
      ) : (
        <div className="space-y-5">
          {data.map((agent) => (
            <PolicyEditor key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyEditor({ agent }: { agent: Agent }) {
  const p = agent.policy;
  const refresh = useRefreshAll();
  const [auto, setAuto] = useState(String(p?.autoApproveLimit ?? ""));
  const [human, setHuman] = useState(String(p?.humanApprovalLimit ?? ""));
  const [hard, setHard] = useState(String(p?.hardMaximum ?? ""));

  useEffect(() => {
    setAuto(String(p?.autoApproveLimit ?? ""));
    setHuman(String(p?.humanApprovalLimit ?? ""));
    setHard(String(p?.hardMaximum ?? ""));
  }, [p?.autoApproveLimit, p?.humanApprovalLimit, p?.hardMaximum]);

  const save = useMutation({
    mutationFn: () =>
      api.updatePolicy(agent.id, {
        autoApproveLimit: Number(auto),
        humanApprovalLimit: Number(human),
        hardMaximum: Number(hard),
      }),
    onSuccess: () => {
      refresh();
      toast.success(`Policy updated for ${agent.name}`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Policy update failed"),
  });

  const dirty =
    Number(auto) !== p?.autoApproveLimit ||
    Number(human) !== p?.humanApprovalLimit ||
    Number(hard) !== p?.hardMaximum;
  const invalid =
    !auto || !human || !hard || Number(auto) > Number(human) || Number(human) > Number(hard);

  const allowed = (safeJson(p?.allowedCategories) as string[] | null) ?? [];
  const blocked = (safeJson(p?.blockedCategories) as string[] | null) ?? [];

  if (!p) {
    return (
      <Panel title={agent.name} description={agent.role}>
        <EmptyState title="No policy attached" hint="This agent has no policy record in the backend." />
      </Panel>
    );
  }

  return (
    <Panel
      title={agent.name}
      description={agent.role}
      actions={
        <div className="flex items-center gap-2">
          <Badge tone={p.isActive ? "allow" : "neutral"} dot>
            {p.isActive ? "POLICY ACTIVE" : "POLICY INACTIVE"}
          </Badge>
          <Btn size="sm" disabled={!dirty || invalid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save thresholds"}
          </Btn>
        </div>
      }
      bodyClassName="px-4 py-4 space-y-5"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Auto approve up to">
          <TextInput inputMode="numeric" value={auto} onChange={(e) => setAuto(e.target.value)} />
        </Field>
        <Field label="Human approval up to">
          <TextInput inputMode="numeric" value={human} onChange={(e) => setHuman(e.target.value)} />
        </Field>
        <Field label="Hard maximum">
          <TextInput inputMode="numeric" value={hard} onChange={(e) => setHard(e.target.value)} />
        </Field>
      </div>

      {invalid ? (
        <p className="text-xs text-block">
          Thresholds must ascend: auto approve ≤ human approval ≤ hard maximum.
        </p>
      ) : null}

      <ThresholdBand
        auto={Number(auto) || 0}
        human={Number(human) || 0}
        hard={Number(hard) || 0}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="label-xs mr-1">Categories</span>
        {allowed.map((c) => (
          <Badge key={c} tone="allow">
            {c}
          </Badge>
        ))}
        {blocked.map((c) => (
          <Badge key={c} tone="block">
            {c}
          </Badge>
        ))}
        <Badge tone={p.requireVendorVerification ? "info" : "neutral"}>
          {p.requireVendorVerification ? "verified vendors only" : "any vendor"}
        </Badge>
      </div>
    </Panel>
  );
}

function ThresholdBand({ auto, human, hard }: { auto: number; human: number; hard: number }) {
  const max = Math.max(hard, 1);
  const autoPct = Math.min((auto / max) * 100, 100);
  const humanPct = Math.min((human / max) * 100, 100);

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="bg-allow" style={{ width: `${autoPct}%` }} />
        <div className="bg-review" style={{ width: `${Math.max(humanPct - autoPct, 0)}%` }} />
        <div className="flex-1 bg-block" />
      </div>
      <div className="num mt-2 flex justify-between text-[11px] text-subtle">
        <span className="text-allow">auto ≤ {formatINR(auto, "INR", false)}</span>
        <span className="text-review">review ≤ {formatINR(human, "INR", false)}</span>
        <span className="text-block">block &gt; {formatINR(hard, "INR", false)}</span>
      </div>
    </div>
  );
}
