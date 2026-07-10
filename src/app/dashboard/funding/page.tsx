"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store/store";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function FundingCallbackPage() {
  const { verifyFunding } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<"checking" | "ok" | "fail">("checking");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) {
      setStatus("fail");
      return;
    }
    (async () => {
      const res = await verifyFunding(reference);
      if (res.ok) {
        setStatus("ok");
        toast("Wallet funded 🎉", "success");
        setTimeout(() => router.replace("/dashboard"), 1400);
      } else {
        setStatus("fail");
        toast(res.error ?? "Could not verify payment", "error");
      }
    })();
  }, [verifyFunding, router, toast]);

  return (
    <div className="mx-auto max-w-md py-16">
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        {status === "checking" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h1 className="text-lg font-semibold text-foreground">
              Confirming your payment…
            </h1>
            <p className="text-sm text-muted-foreground">
              Verifying with Paystack and crediting your wallet.
            </p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-success" />
            <h1 className="text-lg font-semibold text-foreground">
              Payment confirmed
            </h1>
            <p className="text-sm text-muted-foreground">
              Taking you back to your dashboard…
            </p>
          </>
        )}
        {status === "fail" && (
          <>
            <XCircle className="h-12 w-12 text-danger" />
            <h1 className="text-lg font-semibold text-foreground">
              We couldn&apos;t confirm that payment
            </h1>
            <p className="text-sm text-muted-foreground">
              If you were charged, it will reflect shortly via webhook.
            </p>
            <Button className="mt-2" onClick={() => router.replace("/dashboard")}>
              Back to dashboard
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
