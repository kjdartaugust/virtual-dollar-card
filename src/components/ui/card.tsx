import { cn } from "@/lib/utils";

export function Card({
  className,
  hover,
  glass,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  glass?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border text-card-foreground shadow-[var(--shadow-sm)]",
        glass ? "glass" : "border-border bg-card",
        hover && "lift cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "default",
  children,
}: {
  className?: string;
  tone?: "default" | "success" | "danger" | "warning" | "accent";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground ring-border",
    success: "bg-success/12 text-success ring-success/20",
    danger: "bg-danger/12 text-danger ring-danger/20",
    warning: "bg-warning/12 text-warning ring-warning/20",
    accent: "bg-accent/12 text-accent ring-accent/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
