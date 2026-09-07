import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-input px-3 text-sm text-fg outline-none transition placeholder:text-subtle focus:border-primary/60 focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition placeholder:text-subtle focus:border-primary/60 focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-fg", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-input px-3 text-sm text-fg outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
