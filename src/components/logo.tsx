import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  showWord = true,
}: {
  className?: string;
  href?: string;
  showWord?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-bold", className)}
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M12 3v18M8.5 7.5c0-1.7 1.6-2.5 3.5-2.5s3.5.8 3.5 2.6c0 3.9-7 1.8-7 5.4 0 1.8 1.6 2.6 3.5 2.6s3.5-.8 3.5-2.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {showWord && (
        <span className="text-lg tracking-tight text-foreground">Dola</span>
      )}
    </Link>
  );
}
