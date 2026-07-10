"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store/store";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import type { IdType } from "@/lib/types";
import { BadgeCheck, Lock, ShieldCheck } from "lucide-react";

const ID_TYPES: { value: IdType; label: string }[] = [
  { value: "ghana_card", label: "Ghana Card" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's licence" },
  { value: "voter_id", label: "Voter ID" },
];

export default function KycPage() {
  const { state, submitKyc } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    idType: "ghana_card" as IdType,
    idNumber: "",
    dateOfBirth: "",
    address: "",
    city: "Accra",
  });
  const [loading, setLoading] = useState(false);

  if (!state) return null;
  const verified = state.kyc.status === "verified";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Emulate provider verification.
    await submitKyc(form);
    setLoading(false);
    toast("Identity verified ✓", "success");
    router.push("/dashboard");
  };

  if (verified) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Verification
        </h1>
        <Card className="p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/12 text-success">
            <BadgeCheck className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            You&apos;re verified
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your identity has been confirmed. You can create and fund cards.
          </p>
          <div className="mx-auto mt-6 max-w-sm divide-y divide-border rounded-xl border border-border text-left">
            <Row label="ID type" value={idLabel(state.kyc.idType)} />
            <Row label="ID number" value={state.kyc.idNumber ?? "—"} />
            <Row label="City" value={state.kyc.city ?? "—"} />
            <Row
              label="Status"
              value={<Badge tone="success">Verified</Badge>}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Verify your identity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Required by law (KYC) before issuing cards. This is a sandbox — details
          aren&apos;t sent anywhere.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Field label="ID type">
              <Select
                value={form.idType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, idType: e.target.value as IdType }))
                }
              >
                {ID_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ID number">
              <Input
                required
                value={form.idNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, idNumber: e.target.value }))
                }
                placeholder="GHA-123456789-0"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of birth">
                <Input
                  type="date"
                  required
                  value={form.dateOfBirth}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                  }
                />
              </Field>
              <Field label="City">
                <Input
                  required
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Residential address">
              <Input
                required
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="12 Oxford St, Osu"
              />
            </Field>
            <Button type="submit" className="w-full" loading={loading}>
              <ShieldCheck className="h-4 w-4" /> Submit for verification
            </Button>
          </form>
        </Card>

        <Card className="h-fit space-y-4 p-6">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-foreground">
            Why we ask for this
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>Card issuers are legally required to verify cardholders.</li>
            <li>It protects you and the network from fraud.</li>
            <li>In production this is handled by your issuer&apos;s KYC flow.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function idLabel(t?: IdType) {
  return ID_TYPES.find((x) => x.value === t)?.label ?? "—";
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
