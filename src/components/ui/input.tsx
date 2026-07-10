import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground",
        "placeholder:text-muted-foreground/70",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
        "disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
