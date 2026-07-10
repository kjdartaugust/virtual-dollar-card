"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store/store";
import { useToast } from "@/components/ui/toast";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/utils";
import { getIssuer } from "@/lib/issuer";
import { LogOut, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { state, logout, isDemo } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const issuer = getIssuer();

  if (!state) return null;

  const onLogout = () => {
    logout();
    router.replace("/");
  };

  const onReset = () => {
    // Clear this account's local data.
    if (typeof window !== "undefined") {
      const key = isDemo ? "dola:state:demo" : `dola:state:${state.profile.id}`;
      window.localStorage.removeItem(key);
    }
    logout();
    toast("Account data cleared", "success");
    router.replace("/");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile and account.
        </p>
      </div>

      <Card className="divide-y divide-border">
        <Row label="Full name" value={state.profile.fullName} />
        <Row label="Email" value={state.profile.email} />
        <Row label="Phone" value={state.profile.phone ?? "—"} />
        <Row label="Country" value={state.profile.country} />
        <Row label="Member since" value={formatDate(state.profile.createdAt)} />
        <Row
          label="KYC status"
          value={
            <Badge
              tone={state.kyc.status === "verified" ? "success" : "warning"}
            >
              {state.kyc.status === "verified" ? "Verified" : "Unverified"}
            </Badge>
          }
        />
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-foreground">Card program</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cards are issued through the{" "}
          <span className="font-medium text-foreground">{issuer.name}</span>.
        </p>
        <div className="mt-3">
          <Badge tone={issuer.live ? "success" : "warning"}>
            {issuer.live ? "Live mode" : "Sandbox mode"}
          </Badge>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">Log out</p>
          <p className="text-sm text-muted-foreground">
            End your session on this device.
          </p>
        </div>
        <Button variant="outline" onClick={onLogout}>
          <LogOut className="h-4 w-4" /> Log out
        </Button>
      </Card>

      <Card className="flex flex-col gap-4 border-danger/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">Clear account data</p>
          <p className="text-sm text-muted-foreground">
            Permanently delete this account&apos;s local wallet, cards and
            history.
          </p>
        </div>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          <Trash2 className="h-4 w-4" /> Clear data
        </Button>
      </Card>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Clear account data?"
        description="This removes your wallet, cards and transactions from this device. It can't be undone."
      >
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setConfirmReset(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={onReset}>
            Clear everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
