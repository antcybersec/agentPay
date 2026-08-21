import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  FileClock,
  Lock,
  ScanLine,
  ShieldCheck,
  Terminal,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import isoCity from "@/assets/iso-city.jpg";
import isoGate from "@/assets/iso-gate.jpg";
import temple from "@/assets/temple.jpg";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgentPay — Payment Infrastructure for Autonomous AI Agents" },
      {
        name: "description",
        content:
          "AgentPay is the deterministic payment control plane for AI agents. Give agents spending ability without giving them spending authority: policy limits, human approvals, and an immutable audit ledger.",
      },
      { property: "og:title", content: "AgentPay — AI proposes. AgentPay decides." },
      {
        property: "og:description",
        content:
          "Deterministic guardrails for autonomous agent payments: budgets, approval thresholds, verified vendors, full audit trail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-[1240px] px-5">
        <Hero />
        <Meet />
        <Problem />
        <Solution />
        <Why />
        <HowItWorks />
        <PolicyEngine />
        <Developers />
        <Security />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------------- nav */

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6 px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-ink text-[12px] font-bold text-ink-foreground">
            A
          </span>
          <span className="text-[15px] font-bold tracking-[-0.02em]">AgentPay</span>
        </div>
        <nav className="hidden items-center gap-8 text-[13.5px] font-medium text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#policy" className="transition-colors hover:text-foreground">
            Policy engine
          </a>
          <a href="#developers" className="transition-colors hover:text-foreground">
            Developers
          </a>
          <a href="#security" className="transition-colors hover:text-foreground">
            Security
          </a>
        </nav>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-ink py-2.5 pl-4 pr-2.5 text-[13px] font-semibold text-ink-foreground transition-opacity hover:opacity-90"
        >
          Open control plane
          <span className="grid size-6 place-items-center rounded-full bg-ink-foreground/15">
            <ArrowRight className="size-3.5" />
          </span>
        </Link>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="pt-10">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="display text-[54px] text-foreground sm:text-[72px]">
          AI proposes.
          <br />
          <em className="italic text-lilac">AgentPay decides.</em>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-foreground/65">
          Give your agents the ability to spend without giving them the authority. Every payment an
          agent proposes passes through a deterministic policy engine before a single rupee moves.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2.5 rounded-full bg-ink py-2.5 pl-5 pr-2.5 text-[14px] font-semibold text-ink-foreground transition-opacity hover:opacity-90"
          >
            Open control plane
            <span className="grid size-7 place-items-center rounded-full bg-ink-foreground text-ink">
              <ArrowRight className="size-3.5" />
            </span>
          </Link>
          <a
            href="#developers"
            className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-5 py-2.5 text-[14px] font-semibold text-foreground transition-colors hover:bg-accent"
          >
            <Terminal className="size-3.5" />
            Tool contract
          </a>
        </div>
      </div>

      <div className="relative mt-2">
        <img
          src={isoCity}
          alt="Isometric lilac city of banks, vaults and ledgers on floating islands"
          width={1920}
          height={1088}
          className="w-full select-none object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 pb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground/40">
        <span>Razorpay</span>
        <span>LangChain</span>
        <span>MCP</span>
        <span>OpenAI Tools</span>
      </div>
    </section>
  );
}


/* --------------------------------------------------------------- meet */

function Meet() {
  return (
    <section className="py-24">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="display text-[46px] text-foreground sm:text-[54px]">Meet AgentPay.</h2>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-ink py-2.5 pl-5 pr-2.5 text-[14px] font-semibold text-ink-foreground transition-opacity hover:opacity-90"
          >
            Start deciding
            <span className="grid size-7 place-items-center rounded-full bg-ink-foreground text-ink">
              <ArrowRight className="size-3.5" />
            </span>
          </Link>
        </div>
        <p className="text-[22px] leading-[1.4] text-foreground/80 sm:text-[26px]">
          The payment layer for teams whose agents act on their own, move fast, and must never be
          trusted with the authority to spend.
        </p>
      </div>

      <div className="mt-14 grid gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
        <article className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-xl bg-lilac-soft p-7">
          <h3 className="display relative z-10 text-[30px] text-foreground">
            Spend everywhere.
            <br />
            Trust nothing.
          </h3>
          <img
            src={isoGate}
            alt="Isometric lilac policy vault with coins queueing at the gate"
            loading="lazy"
            width={1024}
            height={1024}
            className="pointer-events-none absolute -bottom-6 -right-6 h-[210px] w-auto object-contain mix-blend-multiply [mask-image:radial-gradient(closest-side,black_62%,transparent_92%)]"
          />

          <p className="relative z-10 max-w-[52%] text-[13.5px] leading-relaxed text-foreground/70">
            Agents propose payments through one tool call. The engine decides. Your credentials never
            leave the control plane.
          </p>

        </article>

        <InkCard
          title={
            <>
              Budgets with
              <br />a backbone.
            </>
          }
          body="No prompt-based promises. Daily and monthly limits are recomputed server-side on every intent, before the order exists."
        />
        <InkCard
          title={
            <>
              Approvals, but
              <br />
              instant.
            </>
          }
          body="High-value spend lands in a human queue with the full evaluation snapshot attached. Approve in one click."
        />
      </div>
    </section>
  );
}

function InkCard({ title, body }: { title: React.ReactNode; body: string }) {
  return (
    <article className="flex min-h-[340px] flex-col justify-between rounded-xl bg-ink p-7">
      <h3 className="display text-[30px] text-ink-foreground">{title}</h3>
      <p className="text-[13.5px] leading-relaxed text-ink-muted">{body}</p>
    </article>
  );
}

/* ----------------------------------------------------------- problem */

function Problem() {
  const steps = [
    {
      n: "01",
      lead: "Prompt injection is a payment risk.",
      body: "A single poisoned web page can convince an agent to wire money. Reasoning cannot be the last line of defense in front of a payment rail.",
    },
    {
      n: "02",
      lead: "Budgets are not prompts.",
      body: "\u201cDon't spend more than \u20b950,000\u201d is a suggestion to a model. Here it is a threshold the engine enforces before an order can exist.",
    },
    {
      n: "03",
      lead: "Finance needs a paper trail.",
      body: "Every proposal, evaluation, escalation and settlement is recorded as an immutable event your finance team can replay line by line.",
    },
  ];
  return (
    <section className="pb-24">
      <Eyebrow>Problem</Eyebrow>
      <h2 className="display mx-auto mt-4 max-w-2xl text-center text-[42px] text-foreground sm:text-[50px]">
        Agents are getting spending ability
        <br />
        faster than spending controls.
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-[14.5px] text-muted-foreground">
        You already know which payment your agent should never have made.
      </p>

      <div className="relative mx-auto mt-14 max-w-[620px]">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 border-l border-dashed border-lilac/50" />
        <div className="relative space-y-4">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className={`rounded-xl border border-border p-6 ${
                i % 2 === 1 ? "bg-surface-2" : "bg-surface"
              }`}
            >
              <div className="display text-[26px] text-lilac">{s.n}</div>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                <strong className="font-bold text-foreground">{s.lead}</strong> {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- solution */

function Solution() {
  const stats = [
    ["Open intents", "18"],
    ["Needs approval", "1"],
    ["Evaluated today", "\u20b912,376"],
    ["Blocked", "2"],
  ];
  return (
    <section className="pb-24">
      <div className="relative overflow-hidden rounded-xl bg-ink px-6 py-20 text-center">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-[0.07]" />
        <div className="relative">
          <span className="pill border-ink-foreground/15 bg-ink-foreground/10 text-ink-foreground">
            Solution
          </span>
          <h2 className="display mx-auto mt-5 max-w-2xl text-[42px] text-ink-foreground sm:text-[50px]">
            One <em className="not-italic text-lilac-soft">policy</em>.
            <br />
            Enforced every time.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[14.5px] leading-relaxed text-ink-muted">
            You set the auto-approval limit, the human approval band, the hard maximum, the allowed
            categories and the vendor rules. AgentPay evaluates every intent against them in a fixed
            order — no model in the decision path.
          </p>

          <div className="mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-4">
            {stats.map(([k, v], i) => (
              <div
                key={k}
                className="w-[170px] rounded-xl border border-ink-foreground/12 bg-ink-foreground/[0.06] p-5 text-left backdrop-blur"
                style={{ transform: `rotate(${i % 2 ? 2.5 : -2.5}deg)` }}
              >
                <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  {k}
                </div>
                <div className="display mt-4 text-[34px] text-ink-foreground">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- why */

function Why() {
  const cards = [
    {
      icon: ScanLine,
      title: "It doesn't ask the model",
      body: "Most tools show an agent the rules and hope. AgentPay evaluates deterministically — a compromised prompt cannot raise its own limits.",
    },
    {
      icon: Wallet,
      title: "You only see exceptions",
      body: "Routine spend clears silently. Only intents that cross the approval band reach a human, with the full snapshot attached.",
    },
    {
      icon: FileClock,
      title: "It reads like a ledger",
      body: "Every event is appended, never edited. Finance replays a payment end to end without asking anyone what happened.",
    },
  ];
  return (
    <section className="pb-24">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <Eyebrow align="left">Why</Eyebrow>
          <h2 className="display mt-4 text-[42px] text-foreground sm:text-[48px]">
            Why it works
            <br />
            differently.
          </h2>
          <p className="mt-4 max-w-sm text-[14px] text-muted-foreground">
            Designed for the assumption that the agent is already compromised.
          </p>
        </div>
        <div className="space-y-4">
          {cards.map((c) => (
            <article key={c.title} className="rounded-xl border border-border bg-surface p-6">
              <span className="grid size-10 place-items-center rounded-full bg-lilac-soft text-lilac">
                <c.icon className="size-4.5" strokeWidth={1.75} />
              </span>
              <h3 className="display mt-5 text-[24px] text-foreground">{c.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- how it works */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: Terminal,
      title: "Agent proposes a payment",
      body: "Your agent calls the AgentPay tool with a vendor, amount, category and purpose. It never touches payment credentials.",
    },
    {
      n: "02",
      icon: ShieldCheck,
      title: "The engine evaluates",
      body: "Agent state, vendor verification, category rules, thresholds and remaining daily and monthly budget are checked in a fixed order.",
    },
    {
      n: "03",
      icon: UserCheck,
      title: "Allow, escalate or block",
      body: "Small purchases clear automatically, high-value ones land in the human approval queue, violations are refused and logged.",
    },
    {
      n: "04",
      icon: Lock,
      title: "Settlement on approval only",
      body: "A Razorpay order is created only after a decision resolves to approved. The tool output tells the agent exactly what to do next.",
    },
  ];
  return (
    <section id="how" className="pb-24">
      <Eyebrow>How it works</Eyebrow>
      <h2 className="display mx-auto mt-4 max-w-2xl text-center text-[42px] text-foreground sm:text-[48px]">
        From intent to settlement in four steps.
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-[14.5px] text-muted-foreground">
        No SDK rewrite, no credential handoff. One tool call, one structured verdict.
      </p>

      <div className="mt-14 grid gap-4 md:grid-cols-2">
        {steps.map((s, i) => (
          <article
            key={s.n}
            className={`flex min-h-[240px] flex-col justify-between rounded-xl border border-border p-7 ${
              i % 3 === 0 ? "bg-surface-2" : "bg-surface"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="display text-[26px] text-lilac">{s.n}</span>
              <s.icon className="size-4.5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="display text-[26px] text-foreground">{s.title}</h3>
              <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------- policy engine */

function PolicyEngine() {
  return (
    <section id="policy" className="pb-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Eyebrow align="left">Policy engine</Eyebrow>
          <h2 className="display mt-4 text-[42px] text-foreground sm:text-[48px]">
            Three thresholds,
            <br />
            evaluated in order.
          </h2>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            Each agent carries its own policy: an auto-approval limit, a human approval band, a hard
            maximum it can never cross, allowed and blocked categories, and whether vendors must be
            verified first. Change a limit in the control plane and the next intent is evaluated
            against it.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              ["Auto approve", "Routine spend clears without a human in the loop.", "allow"],
              ["Human approval", "High-value spend is escalated to your approval queue.", "review"],
              ["Hard maximum", "Beyond this the engine refuses, no override path.", "block"],
            ].map(([k, v, tone]) => (
              <li key={k} className="flex items-start gap-3">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    tone === "allow" ? "bg-allow" : tone === "review" ? "bg-review" : "bg-block"
                  }`}
                />
                <div>
                  <div className="text-[14px] font-semibold text-foreground">{k}</div>
                  <div className="text-[13.5px] text-muted-foreground">{v}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-7 shadow-[0_20px_60px_-30px_oklch(0.4_0.1_300_/_0.5)]">
          <div className="label-xs">Threshold band · Ops Copilot</div>
          <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="w-[22%] bg-allow" />
            <div className="w-[48%] bg-review" />
            <div className="flex-1 bg-block" />
          </div>
          <div className="num mt-3 flex justify-between text-[11px]">
            <span className="text-allow">auto ≤ ₹50,000</span>
            <span className="text-review">review ≤ ₹2,00,000</span>
            <span className="text-block">block &gt; ₹2,00,000</span>
          </div>
          <div className="mt-8">
            <MockRow k="Daily budget" v="₹1,20,000 / ₹3,00,000" mono />
            <MockRow k="Monthly budget" v="₹8,40,000 / ₹20,00,000" mono />
            <MockRow k="Vendor verification" v="Required" />
            <MockRow k="Blocked categories" v="CRYPTO, GIFT_CARDS" mono />
          </div>

          <div className="mt-8 rounded-lg border border-border bg-surface-2/60 p-5">
            <div className="label-xs">Live evaluation</div>
            <p className="mt-2 border-l-2 border-lilac/50 pl-3 text-[13px] italic text-muted-foreground">
              "Renew the annual Datadog contract so monitoring doesn't lapse tonight."
            </p>
            <div className="display mt-4 text-[36px] text-foreground">₹1,84,000</div>
            <div className="mt-4 space-y-2.5">
              <MockCheck ok label="Agent active" detail="ACTIVE · budget available" />
              <MockCheck ok label="Vendor verified" detail="Datadog Inc. · VERIFIED" />
              <MockCheck ok label="Category allowed" detail="SOFTWARE in allow-list" />
              <MockCheck ok={false} label="Auto-approve threshold" detail="₹1,84,000 > ₹50,000" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-full border border-review/30 bg-review-soft px-4 py-2.5">
              <span className="text-[12.5px] font-bold text-review">REQUIRE HUMAN APPROVAL</span>
              <span className="num text-[10.5px] text-review/80">ABOVE_AUTO_LIMIT</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-b-0">
      <span className="text-[12.5px] text-muted-foreground">{k}</span>
      <span className={mono ? "num text-[12.5px]" : "text-[12.5px] font-medium"}>{v}</span>
    </div>
  );
}

function MockCheck({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2.5">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-allow" />
      ) : (
        <Ban className="mt-0.5 size-3.5 shrink-0 text-review" />
      )}
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-foreground">{label}</div>
        <div className="num text-[11px] text-subtle">{detail}</div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- developers */

const TOOL_OUTPUT = `{
  "paymentIntentId": "pi_8f21c4a9",
  "decision": "REQUIRE_HUMAN_APPROVAL",
  "status": "PENDING_HUMAN_APPROVAL",
  "reason": "Amount exceeds auto-approval limit",
  "ruleTriggered": "ABOVE_AUTO_LIMIT",
  "razorpayOrderId": null,
  "nextAction": "AWAIT_HUMAN_APPROVAL",
  "evalSnapshot": {
    "amount": 184000,
    "currency": "INR",
    "category": "SOFTWARE",
    "dailyBudgetRemaining": 180000,
    "monthlyBudgetRemaining": 1160000
  }
}`;

function Developers() {
  return (
    <section id="developers" className="pb-24">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-ink/20 bg-ink">
          <div className="flex items-center justify-between border-b border-ink-foreground/10 px-5 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Tool output returned to the agent
            </span>
            <span className="num text-[11px] text-ink-muted/70">application/json</span>
          </div>
          <pre className="num overflow-x-auto p-5 text-[11.5px] leading-relaxed text-lilac-soft">
            {TOOL_OUTPUT}
          </pre>
        </div>

        <div>
          <Eyebrow align="left">Developers</Eyebrow>
          <h2 className="display mt-4 text-[42px] text-foreground sm:text-[48px]">
            One tool call.
            <br />A verdict you can branch on.
          </h2>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            AgentPay returns a machine-readable decision, the exact rule that fired and a single
            <span className="num"> nextAction</span> field. Your agent branches on the verdict instead
            of inventing one — and a rejected payment becomes a normal, handleable outcome.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {[
              ["PROCEED_TO_CHECKOUT", "allow"],
              ["AWAIT_HUMAN_APPROVAL", "review"],
              ["CANCEL_TRANSACTION", "block"],
            ].map(([k, tone]) => (
              <Badge key={k} tone={tone as "allow" | "review" | "block"}>
                {k}
              </Badge>
            ))}
          </div>
          <Link
            to="/playground"
            className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-semibold text-lilac hover:underline"
          >
            Run a live scenario in the runtime
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- security */

function Security() {
  const items = [
    ["Prompt injection", "A compromised prompt still cannot raise its own limits."],
    ["Budget bypass", "Remaining daily and monthly budget is recomputed server-side."],
    ["Vendor spoofing", "Payments only reach vendors in the verified registry."],
    ["Amount tampering", "The evaluated amount is the amount that settles."],
  ];
  return (
    <section id="security" className="pb-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <Eyebrow align="left">Security</Eyebrow>
          <h2 className="display mt-4 text-[42px] text-foreground sm:text-[48px]">
            Built for a world where
            <br />
            the agent is compromised.
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {items.map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-surface p-5">
                <ShieldCheck className="size-4 text-allow" strokeWidth={1.75} />
                <h3 className="mt-3 text-[14px] font-bold text-foreground">{k}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl bg-lilac-soft">
          <img
            src={temple}
            alt="Porcelain lilac temple surrounded by lavender, representing institutional trust"
            loading="lazy"
            width={1200}
            height={1008}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- footer */

function SiteFooter() {
  return (
    <footer className="mx-auto max-w-[1240px] px-5 pb-10">
      <div className="rounded-xl bg-ink p-9 sm:p-12">
        <div className="text-[13px] font-medium text-ink-muted">
          Make your next payment deliberate.
        </div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
          <h2 className="display max-w-2xl text-[42px] text-ink-foreground sm:text-[56px]">
            Let agents spend.
            <br />
            Keep the authority.
          </h2>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2.5 rounded-full bg-ink-foreground py-3 pl-6 pr-3 text-[14px] font-semibold text-ink transition-opacity hover:opacity-90"
          >
            Open control plane
            <span className="grid size-7 place-items-center rounded-full bg-ink text-ink-foreground">
              <ArrowRight className="size-3.5" />
            </span>
          </Link>
        </div>

        <div className="mt-12 grid gap-8 border-t border-ink-foreground/10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg bg-ink-foreground text-[12px] font-bold text-ink">
                A
              </span>
              <span className="text-[15px] font-bold text-ink-foreground">AgentPay</span>
            </div>
            <p className="mt-3 max-w-[220px] text-[13px] text-ink-muted">
              Deterministic payment control for autonomous agents.
            </p>
          </div>
          <FooterCol
            heading="Product"
            links={[
              ["Overview", "/dashboard"],
              ["Payment intents", "/intents"],
              ["Approvals", "/approvals"],
            ]}
          />
          <FooterCol
            heading="Platform"
            links={[
              ["Policies", "/policies"],
              ["Agent runtime", "/playground"],
              ["Audit log", "/audit"],
            ]}
          />
          <FooterCol heading="Trust" links={[["Security center", "/security"]]} />
        </div>

        <div className="num mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink-foreground/10 pt-6 text-[11px] text-ink-muted">
          <span>AGENTPAY CONTROL PLANE · v1</span>
          <span>Deterministic policy engine is the authority</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ heading, links }: { heading: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {heading}
      </div>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link
              to={to}
              className="text-[13.5px] text-ink-foreground/90 transition-opacity hover:opacity-70"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Eyebrow({ children, align = "center" }: { children: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "flex justify-center" : ""}>
      <span className="pill">
        {children}
        <span className="grid size-4 place-items-center rounded-full bg-lilac-soft text-lilac">
          <ArrowUpRight className="size-2.5" />
        </span>
      </span>
    </div>
  );
}
