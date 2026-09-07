import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>{children}</section>
  );
}

export function PanelTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold">{children}</h2>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warn" | "danger" | "primary";
}) {
  const map = {
    default: "bg-elevated text-muted border-border",
    success: "bg-success-soft text-success border-success/20",
    warn: "bg-warning-soft text-warning border-warning/20",
    danger: "bg-danger-soft text-danger border-danger/20",
    primary: "bg-primary-soft text-primary border-primary/20",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", map[tone])}>
      {children}
    </span>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[560px] text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  dir,
}: {
  children?: ReactNode;
  className?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <th dir={dir} className={cn("bg-elevated px-3 py-2.5 text-start text-xs font-semibold text-muted", className)}>
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  dir,
}: {
  children?: ReactNode;
  className?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <td dir={dir} className={cn("border-t border-border px-3 py-2.5 align-middle", className)}>
      {children}
    </td>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-elevated", className)} />;
}
