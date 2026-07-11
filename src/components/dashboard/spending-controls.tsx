"use client";

import { useState } from "react";
import type { Card as CardType } from "@/lib/types";
import {
  CATEGORY_GROUPS,
  type Channel,
  type SpendingControls as Controls,
} from "@/lib/spending-controls";
import { useStore } from "@/lib/store/store";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { formatUSD } from "@/lib/utils";
import { Globe, CreditCard, Landmark, Smartphone } from "lucide-react";

const CHANNELS: { key: Channel; label: string; icon: typeof Globe }[] = [
  { key: "web", label: "Online", icon: Globe },
  { key: "pos", label: "In store", icon: CreditCard },
  { key: "atm", label: "ATM", icon: Landmark },
  { key: "mobile", label: "Mobile", icon: Smartphone },
];

export function SpendingControlsPanel({ card }: { card: CardType }) {
  const { setControls } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Controls>(card.controls);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(card.controls);
  const limit = draft.monthlyLimitUsd;
  const usedPct =
    limit && limit > 0
      ? Math.min(100, (card.spentThisMonth / limit) * 100)
      : 0;

  const toggleCategory = (key: string) =>
    setDraft((d) => ({
      ...d,
      blockedCategories: d.blockedCategories.includes(key)
        ? d.blockedCategories.filter((c) => c !== key)
        : [...d.blockedCategories, key],
    }));

  const toggleChannel = (key: Channel) =>
    setDraft((d) => ({
      ...d,
      channels: { ...d.channels, [key]: !d.channels[key] },
    }));

  const save = async () => {
    setSaving(true);
    const res = await setControls(card.id, draft);
    setSaving(false);
    toast(
      res.ok ? "Spending rules updated" : res.error ?? "Couldn't save",
      res.ok ? "success" : "error"
    );
  };

  return (
    <Card className="p-6">
      <div>
        <p className="text-sm font-semibold text-foreground">Spending rules</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Enforced live, at the moment the card is charged — not after the fact.
        </p>
      </div>

      {/* Monthly limit */}
      <div className="mt-5">
        <Field
          label="Monthly limit"
          hint={
            limit
              ? `${formatUSD(card.spentThisMonth)} of ${formatUSD(
                  limit
                )} used this month`
              : "No limit — leave empty to allow any amount"
          }
        >
          <Input
            type="number"
            inputMode="decimal"
            placeholder="No limit"
            value={limit ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                monthlyLimitUsd: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
        </Field>
        {limit != null && limit > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${usedPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Channels */}
      <div className="mt-6">
        <p className="text-xs font-medium text-muted-foreground">
          Where it works
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CHANNELS.map(({ key, label, icon: Icon }) => {
            const on = draft.channels[key];
            return (
              <button
                key={key}
                onClick={() => toggleChannel(key)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  on
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground line-through"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Blocked categories */}
      <div className="mt-6">
        <p className="text-xs font-medium text-muted-foreground">
          Blocked categories
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(CATEGORY_GROUPS).map(([key, { label }]) => {
            const blocked = draft.blockedCategories.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  blocked
                    ? "border-danger/40 bg-danger/10 text-danger"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {dirty && (
        <Button className="mt-6 w-full" onClick={save} loading={saving}>
          Save rules
        </Button>
      )}
    </Card>
  );
}
