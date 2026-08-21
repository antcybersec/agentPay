import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Btn } from "@/components/ui/controls";

export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-border bg-surface shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="label-xs">{title}</div>
            {subtitle ? <div className="mt-1 min-w-0">{subtitle}</div> : null}
          </div>
          <Btn variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Btn>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  );
}
