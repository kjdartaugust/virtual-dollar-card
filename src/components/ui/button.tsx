import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-glow)] hover:-translate-y-px",
  secondary: "bg-muted text-foreground hover:bg-muted/70",
  ghost: "hover:bg-muted text-foreground",
  danger:
    "bg-danger text-white hover:-translate-y-px hover:shadow-[var(--shadow-md)]",
  outline:
    "border border-border bg-transparent hover:bg-muted hover:border-muted-foreground/30 text-foreground",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-lg font-semibold",
        "transition-all duration-200 ease-[var(--ease-out)] active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
