import type { Transaction, TxnType } from "@/lib/types";
import { cn, formatDateTime, formatUSD } from "@/lib/utils";
import { Badge } from "@/components/ui/card";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Plus,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";

const META: Record<
  TxnType,
  { label: string; icon: typeof Plus }
> = {
  fund_wallet: { label: "Wallet top-up", icon: Plus },
  card_issue: { label: "Card creation fee", icon: CreditCard },
  card_fund: { label: "Card funding", icon: ArrowUpRight },
  card_spend: { label: "Online purchase", icon: ShoppingBag },
  card_refund: { label: "Refund to wallet", icon: RotateCcw },
  fee: { label: "Fee", icon: ArrowDownLeft },
};

export function TransactionItem({ txn }: { txn: Transaction }) {
  const meta = META[txn.type];
  const Icon = meta.icon;
  const positive = txn.amountUsd > 0;
  const declined = txn.status === "declined" || txn.status === "failed";
  const title = txn.merchant ?? meta.label;

  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
          positive ? "bg-success/12 text-success" : "bg-muted text-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {title}
          </p>
          {declined && (
            <Badge tone="danger">
              {txn.status === "declined" ? "Declined" : "Failed"}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {txn.note ?? meta.label}
          {txn.cardLast4 ? ` · •• ${txn.cardLast4}` : ""} ·{" "}
          {formatDateTime(txn.createdAt)}
        </p>
      </div>
      <div className="text-right">
        <p
          className={cn(
            "text-sm font-semibold",
            declined
              ? "text-muted-foreground line-through"
              : positive
                ? "text-success"
                : "text-foreground"
          )}
        >
          {positive ? "+" : ""}
          {formatUSD(txn.amountUsd)}
        </p>
        {txn.amountGhs && (
          <p className="text-xs text-muted-foreground">
            GHS {txn.amountGhs.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
