import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em]",
  {
    variants: {
      tone: {
        neutral: "border-border-strong bg-surface-2 text-muted-foreground",
        allow: "border-allow/25 bg-allow-soft text-allow",
        review: "border-review/25 bg-review-soft text-review",
        block: "border-block/25 bg-block-soft text-block",
        info: "border-info/25 bg-info-soft text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);


export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  tone,
  dot,
  className,
  children,
}: VariantProps<typeof badgeVariants> & {
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

const DECISION_TONE: Record<string, BadgeTone> = {
  ALLOW: "allow",
  REQUIRE_HUMAN_APPROVAL: "review",
  REVIEW: "review",
  BLOCK: "block",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  ORDER_CREATED: "allow",
  APPROVED: "allow",
  COMPLETED: "allow",
  PENDING_HUMAN_APPROVAL: "review",
  EVALUATED: "neutral",
  CREATED: "neutral",
  REJECTED: "block",
  FAILED: "block",
};

const EVENT_TONE: Record<string, BadgeTone> = {
  POLICY_EVALUATED: "info",
  PAYMENT_INTENT_CREATED: "neutral",
  ORDER_CREATED: "allow",
  HUMAN_APPROVED: "allow",
  PAYMENT_SUCCESS: "allow",
  HUMAN_REJECTED: "block",
  PAYMENT_FAILED: "block",
  PAYMENT_BLOCKED: "block",
};

export function DecisionBadge({ decision }: { decision?: string | null | undefined }) {
  if (!decision) return <span className="text-subtle">—</span>;
  const label = decision === "REQUIRE_HUMAN_APPROVAL" ? "REVIEW" : decision;
  return (
    <Badge tone={DECISION_TONE[decision] ?? "neutral"} dot>
      {label}
    </Badge>
  );
}

export function StatusBadge({ status }: { status?: string | null | undefined }) {
  if (!status) return <span className="text-subtle">—</span>;
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status}</Badge>;
}

export function EventBadge({ eventType }: { eventType: string }) {
  return <Badge tone={EVENT_TONE[eventType] ?? "neutral"}>{eventType}</Badge>;
}
