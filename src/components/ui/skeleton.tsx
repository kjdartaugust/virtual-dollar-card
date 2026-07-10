import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("skeleton rounded-lg", className)} {...props} />
  );
}

// Full-page loader used while the store hydrates.
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="aspect-[1.585/1] w-full rounded-2xl" />
        <Skeleton className="aspect-[1.585/1] w-full rounded-2xl" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
