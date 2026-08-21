import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Bot,
  FileClock,
  LayoutDashboard,
  Menu,
  Receipt,
  ShieldCheck,
  Sliders,
  Terminal,
  UserCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Btn, Field, TextInput } from "@/components/ui/controls";
import { getConnection, setConnection } from "@/lib/agentpay/config";
import { useAgents, useConnection, useMetrics, useRefreshAll } from "@/lib/agentpay/hooks";

type NavItem = { to: string; label: string; icon: typeof Activity };

const GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Control plane",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { to: "/intents", label: "Payment Intents", icon: Receipt },
      { to: "/agents", label: "Agents", icon: Bot },
      { to: "/policies", label: "Policies", icon: Sliders },
    ],
  },
  {
    heading: "Operations",
    items: [
      { to: "/approvals", label: "Approvals", icon: UserCheck },
      { to: "/audit", label: "Audit Log", icon: FileClock },
      { to: "/playground", label: "Agent Runtime", icon: Terminal },
    ],
  },
  {
    heading: "Security",
    items: [{ to: "/security", label: "Security Center", icon: ShieldCheck }],
  },
];

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: agents } = useAgents();
  const primary = agents?.[0];

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="grid size-6 place-items-center rounded-sm bg-foreground text-[11px] font-bold text-background">
          A
        </span>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-[-0.01em]">AgentPay</div>
          <div className="label-xs text-[9.5px]">Control Plane</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        {GROUPS.map((group) => (
          <div key={group.heading} className="mb-5">
            <div className="label-xs px-2 pb-1.5">{group.heading}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-sidebar-accent text-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                      )}
                    >
                      <item.icon className="size-3.5" strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="truncate text-[12.5px] text-foreground">{primary?.name ?? "No agent"}</div>
            <div className="num mt-0.5 truncate text-[10.5px] text-subtle">{primary?.id ?? "—"}</div>
          </div>
          <span
            className={cn(
              "ml-2 flex items-center gap-1 text-[10.5px] uppercase tracking-wider",
              primary?.status === "ACTIVE" ? "text-allow" : "text-muted-foreground",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {primary?.status ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ConnectionPopover() {
  const conn = useConnection();
  const refresh = useRefreshAll();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(conn);

  useEffect(() => setForm(conn), [conn]);

  const { data, error, isFetching } = useMetrics();
  const state = isFetching && !data ? "connecting" : error ? "offline" : data ? "online" : "idle";
  const dot = state === "online" ? "bg-allow" : state === "offline" ? "bg-block" : "bg-review";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-2 rounded-sm border border-border-strong bg-surface-2 px-2.5 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <span className={cn("size-1.5 rounded-full", dot)} />
        <span className="num hidden max-w-[220px] truncate sm:inline">{conn.baseUrl}</span>
        <span className="sm:hidden">API</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[340px] rounded-md border border-border bg-popover p-4 shadow-xl">
          <div className="label-xs">Backend connection</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Credentials are stored in this browser only and sent solely to your AgentPay API.
          </p>
          <div className="mt-3 space-y-3">
            <Field label="API base URL">
              <TextInput
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="http://localhost:4000/api"
              />
            </Field>
            <Field label="Admin API key">
              <TextInput
                type="password"
                value={form.adminKey}
                onChange={(e) => setForm({ ...form, adminKey: e.target.value })}
                placeholder="Authorization: Bearer …"
              />
            </Field>
            <Field label="Agent API key">
              <TextInput
                type="password"
                value={form.agentKey}
                onChange={(e) => setForm({ ...form, agentKey: e.target.value })}
                placeholder="x-agent-api-key"
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setForm(getConnection())}>
              Reset
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              onClick={() => {
                setConnection(form);
                refresh();
                setOpen(false);
              }}
            >
              Save
            </Btn>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const refresh = useRefreshAll();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-[228px] border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody />
      </aside>

      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[248px] border-r border-sidebar-border bg-sidebar">
            <SidebarBody onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[228px]">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" className="lg:hidden" onClick={() => setDrawer((v) => !v)}>
              {drawer ? <X className="size-4" /> : <Menu className="size-4" />}
            </Btn>
            <span className="label-xs hidden sm:block">AI proposes · AgentPay decides</span>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={refresh}>
              <Activity className="size-3.5" /> Refresh
            </Btn>
            <ConnectionPopover />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-7 md:px-8">{children}</main>

        <footer className="mx-auto w-full max-w-[1400px] px-4 pb-8 md:px-8">
          <div className="num flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[11px] text-subtle">
            <span>AGENTPAY CONTROL PLANE · v1</span>
            <span>Deterministic policy engine is the authority</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
