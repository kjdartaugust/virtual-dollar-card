"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useStore } from "@/lib/store/store";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { cn, initials } from "@/lib/utils";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/cards", label: "Cards", icon: CreditCard },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/kyc", label: "Verification", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { ready, state, isDemo, logout } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (ready && !state) router.replace("/login");
  }, [ready, state, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!ready || !state) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <DashboardSkeleton />
      </div>
    );
  }

  const onLogout = async () => {
    await logout();
    router.replace("/");
  };

  const NavLinks = () => (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const needsKyc =
          item.href === "/dashboard/kyc" && state.kyc.status !== "verified";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {needsKyc && (
              <span className="ml-auto h-2 w-2 rounded-full bg-warning" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 p-4 lg:flex">
        <div className="px-2 py-2">
          <Logo />
        </div>
        <div className="mt-6 flex-1">
          <NavLinks />
        </div>
        <UserCard name={state.profile.fullName} email={state.profile.email} onLogout={onLogout} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-card p-4">
            <div className="flex items-center justify-between px-2 py-2">
              <Logo />
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="mt-6 flex-1">
              <NavLinks />
            </div>
            <UserCard
              name={state.profile.fullName}
              email={state.profile.email}
              onLogout={onLogout}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-border p-2 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <Logo showWord={false} />
            </div>
            {isDemo && (
              <span className="hidden rounded-full bg-warning/12 px-3 py-1 text-xs font-medium text-warning sm:inline">
                Demo account
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-white">
              {initials(state.profile.fullName)}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function UserCard({
  name,
  email,
  onLogout,
}: {
  name: string;
  email: string;
  onLogout: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-border p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-white">
          {initials(name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}
