"use client";

import { useCountUp } from "@/lib/hooks";
import { formatUSD } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AnimatedBalance({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const display = useCountUp(value);
  return (
    <span className={cn("tabular", className)}>{formatUSD(display)}</span>
  );
}
