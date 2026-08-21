import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";

const btn = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full border text-[12.5px] font-semibold transition-colors duration-100 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-surface text-foreground hover:bg-accent",
        primary: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        allow: "border-allow/30 bg-allow-soft text-allow hover:bg-allow/20",
        block: "border-block/30 bg-block-soft text-block hover:bg-block/15",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        link: "border-transparent bg-transparent text-info hover:underline",
      },
      size: {
        sm: "h-7 px-3",
        md: "h-8 px-3.5",
        lg: "h-9 px-4.5",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);


export function Btn({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof btn>) {
  return <button className={cn(btn({ variant, size }), className)} {...props} />;
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-sm border border-input bg-background px-2.5 text-[13px] text-foreground placeholder:text-subtle focus-visible:border-ring focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-8 rounded-sm border border-input bg-background px-2 text-[12.5px] text-foreground focus-visible:border-ring focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-xs">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
