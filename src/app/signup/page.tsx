"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useStore } from "@/lib/store/store";
import { useToast } from "@/components/ui/toast";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    const res = await signUp({
      email: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      phone: form.phone.trim() || undefined,
    });
    if (res.ok) {
      toast("Account created 🎉", "success");
      router.push("/dashboard");
    } else {
      toast(res.error ?? "Could not sign up", "error");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start spending in dollars in minutes.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Full name">
              <Input
                required
                value={form.fullName}
                onChange={set("fullName")}
                placeholder="Ama Mensah"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Phone" hint="Used for mobile money funding.">
              <Input
                value={form.phone}
                onChange={set("phone")}
                placeholder="+233 24 000 0000"
              />
            </Field>
            <Field label="Password" hint="At least 6 characters.">
              <Input
                type="password"
                required
                value={form.password}
                onChange={set("password")}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" className="w-full" loading={loading}>
              Create account <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Sandbox project — data stays on this device only.
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
