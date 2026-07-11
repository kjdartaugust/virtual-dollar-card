"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store/store";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { VirtualCard } from "@/components/virtual-card";
import { TransactionItem } from "@/components/dashboard/transaction-item";
import { SpendingControlsPanel } from "@/components/dashboard/spending-controls";
import { DEMO_MERCHANTS } from "@/lib/spending-controls";
import { formatDate, formatUSD, groupCardNumber } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Eye,
  EyeOff,
  Play,
  Plus,
  Snowflake,
  Sun,
} from "lucide-react";

type ActionKind = "fund" | "withdraw" | "spend" | null;

// Each carries the MCC the real merchant carries (see lib/spending-controls),
// so the category rules are exercised the way the card network would exercise
// them — Bet9ja really is 7995, and a card that blocks gambling really declines.
const MERCHANTS = Object.keys(DEMO_MERCHANTS);

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const {
    state,
    fundCard,
    withdrawCard,
    spend,
    setCardFrozen,
    terminateCard,
    revealCard,
  } = useStore();

  const [revealed, setRevealed] = useState(false);
  const [secrets, setSecrets] = useState<{ pan: string; cvv: string } | null>(
    null
  );
  const [revealing, setRevealing] = useState(false);
  const [action, setAction] = useState<ActionKind>(null);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState(MERCHANTS[0]);
  const [busy, setBusy] = useState(false);
  const [confirmTerminate, setConfirmTerminate] = useState(false);
  const [freezing, setFreezing] = useState(false);

  if (!state) return null;
  const card = state.cards.find((c) => c.id === id);

  if (!card) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Card not found.</p>
        <Link href="/dashboard/cards" className="mt-3 inline-block text-primary">
          Back to cards
        </Link>
      </div>
    );
  }

  const cardTxns = state.transactions.filter((t) => t.cardId === card.id);
  const terminated = card.status === "terminated";
  const frozen = card.status === "frozen";

  const openAction = (kind: ActionKind) => {
    setAmount("");
    setAction(kind);
  };

  const runAction = async () => {
    const usd = Number(amount);
    if (!usd || usd <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }
    setBusy(true);
    let res: { ok: boolean; error?: string };
    if (action === "fund") res = await fundCard(card.id, usd);
    else if (action === "withdraw") res = await withdrawCard(card.id, usd);
    else res = await spend(card.id, usd, merchant);
    setBusy(false);
    if (res.ok) {
      toast(
        action === "spend"
          ? `Paid ${formatUSD(usd)} to ${merchant}`
          : action === "fund"
            ? "Card funded"
            : "Moved to wallet",
        "success"
      );
      setAction(null);
    } else {
      toast(res.error ?? "Action failed", "error");
    }
  };

  const toggleFreeze = async () => {
    setFreezing(true);
    await setCardFrozen(card.id, !frozen);
    setFreezing(false);
    toast(frozen ? "Card unfrozen" : "Card frozen", "success");
  };

  const doTerminate = async () => {
    await terminateCard(card.id);
    setConfirmTerminate(false);
    toast("Card terminated — balance returned to wallet", "success");
    router.push("/dashboard/cards");
  };

  const toggleReveal = async () => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    if (!secrets) {
      setRevealing(true);
      const s = await revealCard(card.id);
      setRevealing(false);
      if (!s) {
        toast("Couldn't fetch card details", "error");
        return;
      }
      setSecrets(s);
    }
    setRevealed(true);
  };

  const actionTitle =
    action === "fund"
      ? "Add money to card"
      : action === "withdraw"
        ? "Move to wallet"
        : "Simulate a purchase";

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/cards"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to cards
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: the card + reveal */}
        <div className="space-y-4">
          <VirtualCard card={card} revealed={revealed} secrets={secrets} />
          <Button
            variant="outline"
            className="w-full"
            onClick={toggleReveal}
            loading={revealing}
            disabled={terminated}
          >
            {revealed ? (
              <>
                <EyeOff className="h-4 w-4" /> Hide details
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" /> Reveal card details
              </>
            )}
          </Button>

          <Card className="divide-y divide-border">
            <DetailRow
              label="Card number"
              value={
                revealed
                  ? groupCardNumber(secrets?.pan ?? card.pan)
                  : `•••• •••• •••• ${card.last4}`
              }
              mono
            />
            <div className="grid grid-cols-2 divide-x divide-border">
              <DetailRow
                label="Expiry"
                value={`${String(card.expMonth).padStart(2, "0")}/${String(
                  card.expYear
                ).slice(-2)}`}
                mono
              />
              <DetailRow
                label="CVV"
                value={revealed ? secrets?.cvv ?? card.cvv : "•••"}
                mono
              />
            </div>
            <DetailRow label="Network" value={card.brand.toUpperCase()} />
            <DetailRow label="Created" value={formatDate(card.createdAt)} />
          </Card>
        </div>

        {/* Right: balance + actions */}
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Card balance</p>
              <Badge
                tone={
                  terminated ? "danger" : frozen ? "warning" : "success"
                }
              >
                {terminated ? "Terminated" : frozen ? "Frozen" : "Active"}
              </Badge>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {formatUSD(card.balance)}
            </p>

            {!terminated && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button onClick={() => openAction("fund")}>
                  <Plus className="h-4 w-4" /> Add money
                </Button>
                <Button variant="outline" onClick={() => openAction("withdraw")}>
                  <ArrowUpRight className="h-4 w-4" /> To wallet
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openAction("spend")}
                  disabled={frozen}
                >
                  <Play className="h-4 w-4" /> Test purchase
                </Button>
                <Button
                  variant="outline"
                  onClick={toggleFreeze}
                  loading={freezing}
                >
                  {frozen ? (
                    <>
                      <Sun className="h-4 w-4" /> Unfreeze
                    </>
                  ) : (
                    <>
                      <Snowflake className="h-4 w-4" /> Freeze
                    </>
                  )}
                </Button>
              </div>
            )}

            {!terminated && (
              <button
                onClick={() => setConfirmTerminate(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 py-2 text-sm font-medium text-danger hover:bg-danger/5"
              >
                <Ban className="h-4 w-4" /> Terminate card
              </button>
            )}
          </Card>

          {!terminated && <SpendingControlsPanel card={card} />}

          <Card className="px-5">
            <p className="border-b border-border py-3 text-sm font-semibold text-foreground">
              Card activity
            </p>
            {cardTxns.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No activity on this card yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {cardTxns.slice(0, 8).map((t) => (
                  <TransactionItem key={t.id} txn={t} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Amount action modal */}
      <Modal
        open={action !== null}
        onClose={() => setAction(null)}
        title={actionTitle}
        description={
          action === "spend"
            ? "Runs a real authorization through Dola's gateway — the same request, and the same approve/decline contract, the card network uses at a live merchant."
            : undefined
        }
      >
        <div className="space-y-4">
          {action === "spend" && (
            <Field label="Merchant">
              <Select
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              >
                {MERCHANTS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field
            label="Amount (USD)"
            hint={
              action === "fund"
                ? `Wallet balance: ${formatUSD(state.wallet.usdBalance)}`
                : `Card balance: ${formatUSD(card.balance)}`
            }
          >
            <Input
              type="number"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Button className="w-full" onClick={runAction} loading={busy}>
            {action === "fund"
              ? "Add to card"
              : action === "withdraw"
                ? "Move to wallet"
                : `Pay ${merchant}`}
          </Button>
        </div>
      </Modal>

      {/* Terminate confirm */}
      <Modal
        open={confirmTerminate}
        onClose={() => setConfirmTerminate(false)}
        title="Terminate this card?"
        description="This permanently closes the card. Any remaining balance returns to your wallet."
      >
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setConfirmTerminate(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={doTerminate}>
            Terminate
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-sm font-medium text-foreground ${
          mono ? "font-mono tracking-wide" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
