"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useStore } from "@/lib/store/store";
import { useToast } from "@/components/ui/toast";
import { CONFIG } from "@/lib/config";
import { CARD_COLORS } from "@/components/virtual-card";
import { cn, formatUSD } from "@/lib/utils";
import type { CardBrand } from "@/lib/types";

const COLOR_KEYS = Object.keys(CARD_COLORS);

export function CreateCardModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state, issueCard } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [label, setLabel] = useState("Online Shopping");
  const [brand, setBrand] = useState<CardBrand>("visa");
  const [color, setColor] = useState("aurora");
  const [load, setLoad] = useState("10");
  const [loading, setLoading] = useState(false);

  const loadUsd = Number(load) || 0;
  const total = loadUsd + CONFIG.cardIssueFee;
  const balance = state?.wallet.usdBalance ?? 0;

  const submit = async () => {
    setLoading(true);
    const res = await issueCard({ label, brand, color, initialLoadUsd: loadUsd });
    setLoading(false);
    if (res.ok && res.card) {
      toast("Card created 🎉", "success");
      onClose();
      router.push(`/dashboard/cards/${res.card.id}`);
    } else {
      toast(res.error ?? "Could not create card", "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a virtual card"
      description="Instantly issued and loaded from your USD wallet."
    >
      <div className="space-y-4">
        <Field label="Card label">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Subscriptions"
            maxLength={22}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Network">
            <Select
              value={brand}
              onChange={(e) => setBrand(e.target.value as CardBrand)}
            >
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
            </Select>
          </Field>
          <Field label="Initial load (USD)">
            <Input
              type="number"
              inputMode="decimal"
              value={load}
              onChange={(e) => setLoad(e.target.value)}
              min={CONFIG.minCardLoad}
            />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Card colour</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setColor(key)}
                className={cn(
                  "h-9 w-9 rounded-full bg-gradient-to-br ring-offset-2 ring-offset-card transition-all",
                  CARD_COLORS[key],
                  color === key && "ring-2 ring-primary"
                )}
                aria-label={key}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Load onto card</span>
            <span className="font-medium text-foreground">
              {formatUSD(loadUsd)}
            </span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">Card creation fee</span>
            <span className="font-medium text-foreground">
              {formatUSD(CONFIG.cardIssueFee)}
            </span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <span className="font-medium text-foreground">Total from wallet</span>
            <span className="font-bold text-foreground">{formatUSD(total)}</span>
          </div>
        </div>

        {total > balance && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            Wallet balance {formatUSD(balance)} is too low. Fund your wallet
            first.
          </p>
        )}

        <Button
          className="w-full"
          onClick={submit}
          loading={loading}
          disabled={loadUsd < CONFIG.minCardLoad || total > balance}
        >
          Create card · {formatUSD(total)}
        </Button>
      </div>
    </Modal>
  );
}
