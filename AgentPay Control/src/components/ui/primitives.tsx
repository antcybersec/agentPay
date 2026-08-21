import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-md border border-border bg-surface", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div>
            <h2 className="label-xs text-foreground/90">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] text-foreground">{title}</h1>
        {subtitle ? <p className="mt-2 text-[13px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}


export function Metric({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "allow" | "review" | "block";
}) {
  const toneClass = {
    default: "text-foreground",
    allow: "text-allow",
    review: "text-review",
    block: "text-block",
  }[tone];
  return (
    <div className="min-w-0 px-5 py-4 first:pl-0 lg:border-l lg:border-border lg:first:border-l-0">
      <div className="label-xs">{label}</div>
      <div className={cn("num mt-2 text-[26px] font-medium leading-none", toneClass)}>{value}</div>
      {hint ? <div className="mt-2 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border/70 py-2.5 last:border-b-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-[13px] text-foreground">{children}</span>
    </div>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("num text-[12.5px] text-foreground/90", className)}>{children}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-sm text-foreground">{title}</p>
      {hint ? <p className="mx-auto mt-1.5 max-w-md text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({ error, hint }: { error: unknown; hint?: string }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="m-4 rounded-md border border-block/30 bg-block/5 px-4 py-3">
      <p className="text-xs font-medium text-block">API request failed</p>
      <p className="num mt-1 text-[12px] text-muted-foreground">{message}</p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SkeletonRows({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="h-3 animate-pulse rounded-sm bg-surface-2" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Progress({ value, max, tone = "info" }: { value: number; max: number; tone?: "info" | "allow" | "review" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const bar = { info: "bg-info", allow: "bg-allow", review: "bg-review" }[tone];
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={cn("h-full transition-[width] duration-500", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RuleCheck({
  passed,
  label,
  detail,
}: {
  passed: boolean;
  label: string;
  detail?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-border/60 py-2 last:border-b-0">
      <span
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px]",
          passed ? "bg-allow/15 text-allow" : "bg-block/15 text-block",
        )}
      >
        {passed ? "✓" : "✕"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="num text-[12px] uppercase tracking-[0.04em] text-foreground/90">{label}</div>
        {detail ? <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div> : null}
      </div>
    </div>
  );
}
