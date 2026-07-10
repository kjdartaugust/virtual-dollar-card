"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store/store";
import { Card } from "@/components/ui/card";
import { TransactionItem } from "@/components/dashboard/transaction-item";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TxnType } from "@/lib/types";

const FILTERS: { key: TxnType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "card_spend", label: "Spending" },
  { key: "fund_wallet", label: "Top-ups" },
  { key: "card_fund", label: "Card loads" },
  { key: "card_refund", label: "Refunds" },
];

export default function TransactionsPage() {
  const { state } = useStore();
  const [filter, setFilter] = useState<TxnType | "all">("all");

  const grouped = useMemo(() => {
    if (!state) return [];
    const txns =
      filter === "all"
        ? state.transactions
        : state.transactions.filter((t) => t.type === filter);
    const map = new Map<string, typeof txns>();
    for (const t of txns) {
      const day = formatDate(t.createdAt);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(t);
    }
    return Array.from(map.entries());
  }, [state, filter]);

  if (!state) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Transactions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every top-up, card load and purchase.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No transactions in this view.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, txns]) => (
            <div key={day}>
              <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {day}
              </p>
              <Card className="px-5">
                <div className="divide-y divide-border">
                  {txns.map((t) => (
                    <TransactionItem key={t.id} txn={t} />
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
