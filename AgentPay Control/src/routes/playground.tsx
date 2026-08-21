import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge, DecisionBadge, StatusBadge } from "@/components/ui/badge";
import { Btn, Field, TextInput } from "@/components/ui/controls";
import { ErrorState, KeyValue, Mono, PageHeader, Panel } from "@/components/ui/primitives";
import { formatINR } from "@/lib/format";
import { api } from "@/lib/agentpay/client";
import { useRefreshAll } from "@/lib/agentpay/hooks";
import type { ScenarioResult } from "@/lib/agentpay/types";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "Agent Runtime — AgentPay" },
      {
        name: "description",
        content:
          "Run a live agent scenario and watch the proposal, policy evaluation and deterministic tool output resolve in real time.",
      },
      { property: "og:title", content: "Agent Runtime — AgentPay" },
      {
        property: "og:description",
        content: "Watch an AI agent propose a payment and the control plane decide.",
      },
    ],
  }),
  component: PlaygroundPage,
});

const SCENARIOS: { id: "A" | "B" | "C"; label: string; hint: string }[] = [
  { id: "A", label: "Scenario A", hint: "Small purchase inside the auto-approval band" },
  { id: "B", label: "Scenario B", hint: "High value purchase requiring human approval" },
  { id: "C", label: "Scenario C", hint: "Policy violation the engine must block" },
];

function PlaygroundPage() {
  const refresh = useRefreshAll();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const run = useMutation({
    mutationFn: (body: { scenario?: "A" | "B" | "C"; prompt?: string }) => api.runScenario(body),
    onSuccess: (data) => {
      setResult(data);
      refresh();
      toast.success(`Decision: ${data.toolOutput.decision.replaceAll("_", " ")}`);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Scenario failed"),
  });

  return (
    <div className="space-y-7">
      <PageHeader
        title="Agent Runtime"
        subtitle="AI proposes. AgentPay decides. Run a real scenario against your backend and inspect the deterministic tool output the agent receives."
      />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <Panel title="Preset scenarios" bodyClassName="divide-y divide-border">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                disabled={run.isPending}
                onClick={() => run.mutate({ scenario: s.id })}
                className="row-hover flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:opacity-50"
              >
                <div>
                  <div className="text-[13px] font-medium text-foreground">{s.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.hint}</div>
                </div>
                <Play className="size-3.5 shrink-0 text-subtle" />
              </button>
            ))}
          </Panel>

          <Panel title="Free-form prompt" bodyClassName="space-y-3 px-4 py-4">
            <Field label="Instruction given to the agent">
              <TextInput
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Buy 200 API credits from OpenAI"
              />
            </Field>
            <Btn
              className="w-full"
              disabled={!prompt.trim() || run.isPending}
              onClick={() => run.mutate({ prompt: prompt.trim() })}
            >
              <Sparkles className="size-3.5" />
              {run.isPending ? "Running…" : "Run agent"}
            </Btn>
          </Panel>
        </div>

        <div className="space-y-5">
          {run.error ? <ErrorState error={run.error} /> : null}
          {!result ? (
            <Panel bodyClassName="px-6 py-16 text-center">
              <p className="text-[13px] text-muted-foreground">
                Run a scenario to see the agent's reasoning, its proposed payment and the tool output
                returned by the policy engine.
              </p>
            </Panel>
          ) : (
            <ResultView result={result} />
          )}
        </div>
      </div>
    </div>
  );
}

function ResultView({ result }: { result: ScenarioResult }) {
  const t = result.toolOutput;
  return (
    <div className="space-y-5">
      <Panel title="1 · Agent proposes" bodyClassName="px-4 py-4 space-y-3">
        <p className="text-[13px] text-muted-foreground">"{result.userPrompt}"</p>
        <p className="border-l-2 border-border-strong pl-3 text-[13px] text-foreground">
          {result.agentThought}
        </p>
        <div>
          <KeyValue label="Vendor">{result.proposedPayment.vendor}</KeyValue>
          <KeyValue label="Amount">
            <Mono>
              {formatINR(result.proposedPayment.amount, result.proposedPayment.currency ?? "INR", false)}
            </Mono>
          </KeyValue>
          <KeyValue label="Category">
            <Mono>{result.proposedPayment.category}</Mono>
          </KeyValue>
          <KeyValue label="Purpose">{result.proposedPayment.purpose}</KeyValue>
        </div>
      </Panel>

      <Panel
        title="2 · AgentPay decides"
        description={t.reason}
        bodyClassName="px-4 py-4 space-y-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <DecisionBadge decision={t.decision} />
          <StatusBadge status={t.status} />
          <Badge tone="info">{t.nextAction.replaceAll("_", " ")}</Badge>
          <Badge tone="neutral">{t.ruleTriggered}</Badge>
        </div>
        <div>
          <KeyValue label="Payment intent">
            <Mono>{t.paymentIntentId}</Mono>
          </KeyValue>
          <KeyValue label="Razorpay order">
            <Mono>{t.razorpayOrderId ?? "—"}</Mono>
          </KeyValue>
          <KeyValue label="Daily budget remaining">
            <Mono>{formatINR(t.evalSnapshot.dailyBudgetRemaining, "INR", false)}</Mono>
          </KeyValue>
          <KeyValue label="Monthly budget remaining">
            <Mono>{formatINR(t.evalSnapshot.monthlyBudgetRemaining, "INR", false)}</Mono>
          </KeyValue>
        </div>
      </Panel>

      <Panel title="3 · Tool output returned to the agent" bodyClassName="px-4 py-4">
        <pre className="num overflow-x-auto rounded-sm bg-surface-2 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
          {JSON.stringify(t, null, 2)}
        </pre>
      </Panel>
    </div>
  );
}
