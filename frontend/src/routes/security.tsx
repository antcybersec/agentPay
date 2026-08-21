import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Btn } from "@/components/ui/controls";
import { ErrorState, PageHeader, Panel } from "@/components/ui/primitives";
import { api } from "@/lib/agentpay/client";
import { useRefreshAll } from "@/lib/agentpay/hooks";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security Center — AgentPay" },
      {
        name: "description",
        content:
          "Adversarial simulations against the AgentPay control plane: prompt injection, budget bypass, vendor spoofing and replay attempts.",
      },
      { property: "og:title", content: "Security Center — AgentPay" },
      {
        property: "og:description",
        content: "Prove the guardrails hold when the agent is compromised.",
      },
    ],
  }),
  component: SecurityPage,
});

const ATTACKS: { id: string; label: string; description: string }[] = [
  {
    id: "PROMPT_INJECTION",
    label: "Prompt injection",
    description: "A malicious instruction tells the agent to ignore its spending policy.",
  },
  {
    id: "BUDGET_BYPASS",
    label: "Budget bypass",
    description: "The agent attempts a payment beyond its remaining budget.",
  },
  {
    id: "VENDOR_SPOOFING",
    label: "Vendor spoofing",
    description: "An unverified vendor impersonates a trusted supplier.",
  },
  {
    id: "AMOUNT_TAMPERING",
    label: "Amount tampering",
    description: "The payload amount is mutated after policy evaluation.",
  },
];

type Outcome = { attack: string; status: number; body: unknown };

function SecurityPage() {
  const refresh = useRefreshAll();
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  const run = useMutation({
    mutationFn: (attackType: string) => api.securitySimulation(attackType),
    onSuccess: (res, attackType) => {
      setOutcomes((prev) => [{ attack: attackType, status: res.status, body: res.body }, ...prev]);
      refresh();
    },
  });

  return (
    <div className="space-y-7">
      <PageHeader
        title="Security Center"
        subtitle="Fire adversarial requests at the live backend and confirm the deterministic layer refuses them. Nothing here is simulated in the browser — every response comes from your API."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {ATTACKS.map((a) => (
          <Panel
            key={a.id}
            title={a.label}
            description={a.description}
            actions={
              <Btn size="sm" variant="ghost" disabled={run.isPending} onClick={() => run.mutate(a.id)}>
                <ShieldAlert className="size-3.5" />
                Simulate
              </Btn>
            }
            bodyClassName="px-4 py-3"
          >
            <p className="num text-[11.5px] text-subtle">POST /test/security-simulation · {a.id}</p>
          </Panel>
        ))}
      </div>

      {run.error ? <ErrorState error={run.error} /> : null}

      <Panel title="Simulation results" bodyClassName="divide-y divide-border">
        {outcomes.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            No simulations run in this session yet.
          </p>
        ) : (
          outcomes.map((o, i) => {
            const blocked = o.status >= 400;
            return (
              <div key={`${o.attack}-${i}`} className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={blocked ? "allow" : "review"} dot>
                    {blocked ? "REFUSED BY CONTROL PLANE" : `HTTP ${o.status}`}
                  </Badge>
                  <span className="num text-[12px] text-muted-foreground">{o.attack}</span>
                  {blocked ? <ShieldCheck className="size-3.5 text-allow" /> : null}
                </div>
                <pre className="num mt-3 overflow-x-auto rounded-sm bg-surface-2 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
                  {typeof o.body === "string" ? o.body : JSON.stringify(o.body, null, 2)}
                </pre>
              </div>
            );
          })
        )}
      </Panel>
    </div>
  );
}
