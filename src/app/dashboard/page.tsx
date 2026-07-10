"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VirtualCard } from "@/components/virtual-card";
import { FundWalletModal } from "@/components/dashboard/fund-wallet-modal";
import { CreateCardModal } from "@/components/dashboard/create-card-modal";
import { TransactionItem } from "@/components/dashboard/transaction-item";
import { Sparkline } from "@/components/dashboard/sparkline";
import { AnimatedBalance } from "@/components/dashboard/animated-balance";
import { formatUSD } from "@/lib/utils";
import { usdToGhs } from "@/lib/config";
import {
  ArrowRight,
  CreditCard,
  Plus,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Wallet,
} from "lucide-react";

export default function OverviewPage() {
  const { state } = useStore();
  const [fundOpen, setFundOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  const stats = useMemo(() => {
    if (!state) return null;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    let monthSpend = 0;
    let totalAdded = 0;
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    for (const t of state.transactions) {
      const d = new Date(t.createdAt);
      const key = d.toISOString().slice(0, 10);
      if (t.type === "card_spend" && t.status === "success") {
        if (`${d.getFullYear()}-${d.getMonth()}` === monthKey)
          monthSpend += Math.abs(t.amountUsd);
        if (key in days) days[key] += Math.abs(t.amountUsd);
      }
      if (t.type === "fund_wallet" && t.status === "success")
        totalAdded += t.amountUsd;
    }
    return {
      monthSpend,
      totalAdded,
      series: Object.values(days),
    };
  }, [state]);

  if (!state || !stats) return null;

  const verified = state.kyc.status === "verified";
  const activeCards = state.cards.filter((c) => c.status !== "terminated");
  const { ghs } = usdToGhs(state.wallet.usdBalance);
  const firstName = state.profile.fullName.split(" ")[0];

  return (
    <div className="space-y-7">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Hi {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your money.
        </p>
      </div>

      {!verified && (
        <Card className="flex animate-fade-up flex-col items-start gap-4 border-warning/40 bg-warning/5 p-5 sm:flex-row sm:items-center">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              Verify your identity to issue cards
            </p>
            <p className="text-sm text-muted-foreground">
              A quick KYC step unlocks card creation. Sandbox approves instantly.
            </p>
          </div>
          <Link href="/dashboard/kyc">
            <Button size="sm">
              Verify now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      )}

      {/* Wallet hero */}
      <Card className="relative animate-fade-up overflow-hidden p-0">
        <div className="grid-glow grain absolute inset-0 opacity-70" />
        <div className="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" /> USD Wallet balance
            </p>
            <AnimatedBalance
              value={state.wallet.usdBalance}
              className="mt-2 block text-[2.75rem] font-bold leading-none tracking-tight text-foreground"
            />
            <p className="mt-2 text-sm text-muted-foreground tabular">
              ≈ GHS {ghs.toLocaleString()}
            </p>
            <div className="mt-5 flex gap-3">
              <Button onClick={() => setFundOpen(true)}>
                <Plus className="h-4 w-4" /> Add money
              </Button>
              <Button
                variant="outline"
                onClick={() => setCardOpen(true)}
                disabled={!verified}
              >
                <CreditCard className="h-4 w-4" /> New card
              </Button>
            </div>
          </div>

          <div className="w-full max-w-xs rounded-xl border border-border bg-background/40 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <TrendingDown className="h-3.5 w-3.5" /> Spent this month
              </span>
              <span className="text-sm font-semibold text-foreground tabular">
                {formatUSD(stats.monthSpend)}
              </span>
            </div>
            <Sparkline
              data={stats.series}
              className="mt-3 h-12 w-full"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Last 14 days
            </p>
          </div>
        </div>
      </Card>

      {/* Stat tiles */}
      <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile
          label="Active cards"
          value={String(activeCards.length)}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatTile
          label="Spent this month"
          value={formatUSD(stats.monthSpend)}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <StatTile
          className="col-span-2 sm:col-span-1"
          label="Total added"
          value={formatUSD(stats.totalAdded)}
          icon={<Plus className="h-4 w-4" />}
        />
      </div>

      {/* Cards */}
      <div className="animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Your cards</h2>
          <Link
            href="/dashboard/cards"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {activeCards.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="font-medium text-foreground">No cards yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {verified
                ? "Create your first virtual dollar card and start paying online."
                : "Verify your identity, then create your first card."}
            </p>
            <Button
              className="mt-1"
              onClick={() => setCardOpen(true)}
              disabled={!verified}
            >
              <Plus className="h-4 w-4" /> Create a card
            </Button>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {activeCards.slice(0, 2).map((card) => (
              <Link key={card.id} href={`/dashboard/cards/${card.id}`}>
                <VirtualCard card={card} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="animate-fade-up">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent activity</h2>
          <Link
            href="/dashboard/transactions"
            className="text-sm font-medium text-primary hover:underline"
          >
            See all
          </Link>
        </div>
        <Card className="px-5">
          {state.transactions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No transactions yet. Add money to get started.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {state.transactions.slice(0, 6).map((txn) => (
                <TransactionItem key={txn.id} txn={txn} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <FundWalletModal open={fundOpen} onClose={() => setFundOpen(false)} />
      <CreateCardModal open={cardOpen} onClose={() => setCardOpen(false)} />
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`p-4 ${className ?? ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted">
          {icon}
        </span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-3 text-xl font-bold tracking-tight text-foreground tabular">
        {value}
      </p>
    </Card>
  );
}
