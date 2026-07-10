"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store/store";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { VirtualCard } from "@/components/virtual-card";
import { CreateCardModal } from "@/components/dashboard/create-card-modal";
import { formatUSD } from "@/lib/utils";
import { Plus, ShieldAlert } from "lucide-react";

export default function CardsPage() {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  if (!state) return null;

  const verified = state.kyc.status === "verified";
  const active = state.cards.filter((c) => c.status !== "terminated");
  const terminated = state.cards.filter((c) => c.status === "terminated");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Cards
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length} active {active.length === 1 ? "card" : "cards"}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!verified}>
          <Plus className="h-4 w-4" /> New card
        </Button>
      </div>

      {!verified && (
        <Card className="flex items-center gap-3 border-warning/40 bg-warning/5 p-4 text-sm">
          <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
          <span className="text-foreground">
            Verify your identity to create cards.
          </span>
          <Link
            href="/dashboard/kyc"
            className="ml-auto font-medium text-primary"
          >
            Verify
          </Link>
        </Card>
      )}

      {active.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-medium text-foreground">No active cards</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Create your first virtual dollar card to start paying online.
          </p>
          <Button
            className="mt-4"
            onClick={() => setOpen(true)}
            disabled={!verified}
          >
            <Plus className="h-4 w-4" /> Create a card
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {active.map((card) => (
            <Link key={card.id} href={`/dashboard/cards/${card.id}`}>
              <div className="space-y-3">
                <VirtualCard card={card} />
                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {card.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatUSD(card.balance)} available
                    </p>
                  </div>
                  <Badge tone={card.status === "frozen" ? "warning" : "success"}>
                    {card.status === "frozen" ? "Frozen" : "Active"}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {terminated.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Terminated
          </h2>
          <Card className="divide-y divide-border">
            {terminated.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {c.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    •••• {c.last4}
                  </p>
                </div>
                <Badge tone="danger">Terminated</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}

      <CreateCardModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
