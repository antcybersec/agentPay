import { RuleCheck } from "@/components/ui/primitives";
import { formatINR, safeJson } from "@/lib/format";
import type { Agent, PaymentIntent, Vendor } from "@/lib/agentpay/types";

export type Check = { label: string; passed: boolean; detail: string };

/**
 * Mirrors the backend policy rules against the CURRENT live agent/policy/vendor
 * records returned by the API. It is a read-only projection of real values —
 * the deterministic backend engine remains the sole decision authority.
 */
export function buildChecks(
  intent: Pick<PaymentIntent, "amount" | "category" | "rawVendorName" | "vendorId">,
  agent?: Agent | null,
  vendors: Vendor[] = [],
): Check[] {
  if (!agent?.policy) return [];
  const p = agent.policy;
  const allowedCategories = (safeJson(p.allowedCategories) as string[] | null) ?? [];
  const blockedCategories = (safeJson(p.blockedCategories) as string[] | null) ?? [];
  const vendor =
    vendors.find((v) => v.id === intent.vendorId) ??
    vendors.find((v) => v.name.toLowerCase() === intent.rawVendorName?.toLowerCase());

  const dailyRemaining = agent.dailyBudget - agent.spentDaily;
  const monthlyRemaining = agent.monthlyBudget - agent.spentMonthly;

  return [
    {
      label: "Agent active",
      passed: agent.status === "ACTIVE",
      detail: `Agent status ${agent.status}`,
    },
    {
      label: "Vendor verified",
      passed: !p.requireVendorVerification || vendor?.status === "VERIFIED",
      detail: vendor
        ? `${vendor.name} · ${vendor.status}`
        : `${intent.rawVendorName} not present in the verified vendor registry`,
    },
    {
      label: "Category allowed",
      passed:
        !blockedCategories.includes(intent.category) &&
        (allowedCategories.length === 0 || allowedCategories.includes(intent.category)),
      detail: `${intent.category} · allowed ${allowedCategories.join(", ") || "any"}`,
    },
    {
      label: "Auto approval threshold",
      passed: intent.amount <= p.autoApproveLimit,
      detail: `${formatINR(intent.amount)} vs limit ${formatINR(p.autoApproveLimit)}`,
    },
    {
      label: "Human approval threshold",
      passed: intent.amount <= p.humanApprovalLimit,
      detail: `${formatINR(intent.amount)} vs limit ${formatINR(p.humanApprovalLimit)}`,
    },
    {
      label: "Below hard maximum",
      passed: intent.amount <= p.hardMaximum,
      detail: `${formatINR(intent.amount)} vs hard max ${formatINR(p.hardMaximum)}`,
    },
    {
      label: "Daily budget available",
      passed: intent.amount <= dailyRemaining,
      detail: `${formatINR(dailyRemaining)} remaining today`,
    },
    {
      label: "Monthly budget available",
      passed: intent.amount <= monthlyRemaining,
      detail: `${formatINR(monthlyRemaining)} remaining this month`,
    },
  ];
}

export function PolicyCheckList({ checks }: { checks: Check[] }) {
  if (checks.length === 0) {
    return (
      <p className="py-3 text-xs text-muted-foreground">
        No policy attached to this agent in the backend response.
      </p>
    );
  }
  return (
    <div>
      {checks.map((c) => (
        <RuleCheck key={c.label} passed={c.passed} label={c.label} detail={c.detail} />
      ))}
    </div>
  );
}
