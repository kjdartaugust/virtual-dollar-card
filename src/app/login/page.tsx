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
import { ArrowRight, PlayCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginDemo } = useStore();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = login(email.trim(), password);
    if (res.ok) {
      toast("Welcome back", "success");
      router.push("/dashboard");
    } else {
      toast(res.error ?? "Login failed", "error");
      setLoading(false);
    }
  };

  const onDemo = () => {
    loginDemo();
    toast("Loaded demo account", "success");
    router.push("/dashboard");
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
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Log in to manage your dollar cards.
            </p>
          </div>

          <button
            onClick={onDemo}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <PlayCircle className="h-4 w-4" />
            Explore the demo account — no signup
          </button>

          <div className="relative mb-6 text-center">
            <span className="relative z-10 bg-background px-3 text-xs uppercase tracking-wider text-muted-foreground">
              or log in
            </span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" className="w-full" loading={loading}>
              Log in <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Dola?{" "}
            <Link href="/signup" className="font-semibold text-primary">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
