"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useStore } from "@/lib/store/store";
import { useToast } from "@/components/ui/toast";
import { CONFIG, ghsToUsd, sellRate } from "@/lib/config";
import { formatUSD } from "@/lib/utils";

const METHODS = ["MTN MoMo", "Vodafone Cash", "AirtelTigo Money", "Bank card"];
const PRESETS = [100, 250, 500, 1000];

export function FundWalletModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { fundWallet } = useStore();
  const toast = useToast();
  const [ghs, setGhs] = useState("250");
  const [method, setMethod] = useState(METHODS[0]);
  const [loading, setLoading] = useState(false);

  const amount = Number(ghs) || 0;
  const { usd } = ghsToUsd(amount);

  const submit = async () => {
    setLoading(true);
    // Simulate a Paystack checkout round-trip.
    await new Promise((r) => setTimeout(r, 900));
    const res = await fundWallet(amount, method);
    if (res.ok && res.redirect) return; // redirecting to Paystack checkout
    setLoading(false);
    if (res.ok) {
      toast(
        res.usd
          ? `Wallet funded with ${formatUSD(res.usd)}`
          : "Wallet funded",
        "success"
      );
      onClose();
      setGhs("250");
    } else {
      toast(res.error ?? "Funding failed", "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Fund your wallet"
      description="Pay in cedis via Paystack — we credit your wallet in USD."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setGhs(String(p))}
              className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                amount === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <Field label="Amount (GHS)">
          <Input
            type="number"
            inputMode="decimal"
            value={ghs}
            onChange={(e) => setGhs(e.target.value)}
            min={CONFIG.minFundGhs}
          />
        </Field>

        <Field label="Payment method">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-medium text-foreground">
              GHS {sellRate()} / $1
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">You&apos;ll receive</span>
            <span className="text-lg font-bold text-primary">
              {formatUSD(usd)}
            </span>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={submit}
          loading={loading}
          disabled={amount < CONFIG.minFundGhs}
        >
          Pay GHS {amount.toLocaleString()}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Test mode — no real charge is made.
        </p>
      </div>
    </Modal>
  );
}
