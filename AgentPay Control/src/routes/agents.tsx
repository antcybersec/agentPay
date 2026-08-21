import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Btn } from "@/components/ui/controls";
import {
  EmptyState,
  ErrorState,
  KeyValue,
  Mono,
  PageHeader,
  Panel,
  Progress,
  SkeletonRows,
} from "@/components/ui/primitives";
import { compactINR, formatINR, safeJson, shortId } from "@/lib/format";
import { api } from "@/lib/agentpay/client";
import { useAgents, useRefreshAll } from "@/lib/agentpay/hooks";
import type { Agent } from "@/lib/agentpay/types";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agents — AgentPay" },
      {
        name: "description",
        content:
          "Every autonomous agent with spending authority: budgets consumed, policy limits, credentials and activation state.",
      },
      { property: "og:title", content: "Agents — AgentPay" },
      {
        property: "og:description",
        content: "Budgets, limits and kill switches for every autonomous spender.",
      },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const { data, isLoading, error } = useAgents();
  const refresh = useRefreshAll();
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.setAgentStatus(id, status),
    onSuccess: (_d, v) => {
      refresh();
      toast.success(`Agent ${v.status === "ACTIVE" ? "reactivated" : "suspended"}`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <div className="space-y-7">
      <PageHeader
        title="Agents"
        subtitle="Autonomous spenders operating under AgentPay guardrails. Suspend any agent to revoke its spending authority instantly."
      />

      {isLoading ? (
        <Panel>
          <SkeletonRows rows={4} cols={4} />
        </Panel>
      ) : error ? (
        <ErrorState error={error} />
      ) : !data || data.length === 0 ? (
        <Panel>
          <EmptyState title="No agents registered" hint="Seed agents in your AgentPay backend." />
        </Panel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {data.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              busy={setStatus.isPending}
              onToggle={() =>
                setStatus.mutate({
                  id: agent.id,
                  status: agent.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  busy,
  onToggle,
}: {
  agent: Agent;
  busy: boolean;
  onToggle: () => void;
}) {
  const active = agent.status === "ACTIVE";
  const p = agent.policy;
  const allowed = (safeJson(p?.allowedCategories) as string[] | null) ?? [];
  const blocked = (safeJson(p?.blockedCategories) as string[] | null) ?? [];

  return (
    <Panel
      title={agent.name}
      description={agent.role}
      actions={
        <div className="flex items-center gap-2">
          <Badge tone={active ? "allow" : "block"} dot>
            {agent.status}
          </Badge>
          <Btn variant={active ? "block" : "allow"} size="sm" disabled={busy} onClick={onToggle}>
            {active ? "Suspend" : "Activate"}
          </Btn>
        </div>
      }
      bodyClassName="px-4 py-4 space-y-5"
    >
      <div className="grid grid-cols-2 gap-5">
        <BudgetBar
          label="Daily budget"
          spent={agent.spentDaily}
          total={agent.dailyBudget}
          tone="info"
        />
        <BudgetBar
          label="Monthly budget"
          spent={agent.spentMonthly}
          total={agent.monthlyBudget}
          tone="allow"
        />
      </div>

      <div>
        <KeyValue label="Agent ID">
          <Mono>{shortId(agent.id, 20)}</Mono>
        </KeyValue>
        <KeyValue label="API key">
          <Mono>{shortId(agent.apiKey, 12)}</Mono>
        </KeyValue>
        <KeyValue label="Auto-approve under">
          <Mono>{p ? formatINR(p.autoApproveLimit, "INR", false) : "—"}</Mono>
        </KeyValue>
        <KeyValue label="Human approval under">
          <Mono>{p ? formatINR(p.humanApprovalLimit, "INR", false) : "—"}</Mono>
        </KeyValue>
        <KeyValue label="Hard maximum">
          <Mono>{p ? formatINR(p.hardMaximum, "INR", false) : "—"}</Mono>
        </KeyValue>
        <KeyValue label="Vendor verification">
          {p?.requireVendorVerification ? "Required" : "Not required"}
        </KeyValue>
      </div>

      <div className="flex flex-wrap gap-1.5">
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
      </div>
    </Panel>
  );
}

function BudgetBar({
  label,
  spent,
  total,
  tone,
}: {
  label: string;
  spent: number;
  total: number;
  tone: "info" | "allow";
}) {
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div className="num mt-1.5 text-[18px] font-medium tabular-nums">
        {compactINR(spent)}{" "}
        <span className="text-[12px] text-subtle">/ {compactINR(total)}</span>
      </div>
      <div className="mt-2">
        <Progress value={spent} max={total} tone={tone} />
      </div>
    </div>
  );
}
