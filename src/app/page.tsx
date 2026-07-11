import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MerchantMarquee } from "@/components/marketing/marquee";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { VirtualCard } from "@/components/virtual-card";
import { CONFIG, sellRate } from "@/lib/config";
import type { Card } from "@/lib/types";
import { DEFAULT_CONTROLS } from "@/lib/spending-controls";
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Globe,
  Lock,
  Smartphone,
  Snowflake,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

const heroCard: Card = {
  id: "hero",
  providerRef: "iss_hero",
  brand: "visa",
  label: "Dola USD",
  pan: "4242424242424242",
  cvv: "318",
  expMonth: 8,
  expYear: new Date().getFullYear() + 3,
  cardholder: "AMA MENSAH",
  balance: 240,
  status: "active",
  color: "aurora",
  createdAt: new Date().toISOString(),
  last4: "4242",
  controls: DEFAULT_CONTROLS,
  spentThisMonth: 0,
};

const steps = [
  {
    icon: BadgeCheck,
    title: "Verify once",
    body: "Quick KYC with your Ghana Card or passport. Sandbox approves instantly.",
  },
  {
    icon: Wallet,
    title: "Fund in cedis",
    body: "Top up with MTN MoMo, Vodafone Cash or your bank card via Paystack.",
  },
  {
    icon: CreditCard,
    title: "Spend in dollars",
    body: "Create a virtual USD card and pay any online merchant, instantly.",
  },
];

const features = [
  {
    icon: Zap,
    title: "Cards in seconds",
    body: "Issue a virtual Visa or Mastercard on demand — no waiting, no branch visits.",
  },
  {
    icon: Globe,
    title: "Works everywhere online",
    body: "Netflix, Spotify, ChatGPT, Meta & Google Ads, AWS, Amazon — anywhere USD is accepted.",
  },
  {
    icon: Snowflake,
    title: "Freeze & control",
    body: "Freeze, unfreeze or terminate a card anytime. Your money returns to your wallet.",
  },
  {
    icon: Lock,
    title: "Reveal securely",
    body: "Card number and CVV stay hidden until you choose to reveal them.",
  },
  {
    icon: Smartphone,
    title: "Built for mobile",
    body: "A fast, responsive dashboard that feels great on the phone in your pocket.",
  },
  {
    icon: Sparkles,
    title: "Transparent rates",
    body: `One clear rate of GHS ${sellRate()} / $1 and a $${CONFIG.cardIssueFee} card fee. No surprises.`,
  },
];

const faqs = [
  {
    q: "Is this real money?",
    a: "Not yet. Cards are issued by a real card issuer (Sudo) but in sandbox, and Paystack runs in test mode — so no live funds move. The architecture is the production one: Dola holds the ledger and authorizes every card spend in real time, in the card network's own protocol.",
  },
  {
    q: "How would it work in production?",
    a: "You integrate a licensed B2B card issuer, hold a USD float with them, collect GHS from customers via Paystack/Flutterwave, and call the issuer API to mint and fund cards. KYC and PCI-DSS compliance are handled with the provider.",
  },
  {
    q: "What can I pay for?",
    a: "Any merchant that accepts Visa/Mastercard online — subscriptions, ads platforms, cloud services, shopping and API bills.",
  },
  {
    q: "How do you make money?",
    a: "A small FX spread on the cedi-to-dollar rate plus a flat card creation fee — the same model real issuers use.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mesh-bg" />
        <div className="grain absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <Badge tone="accent" className="mb-5">
              <Sparkles className="h-3.5 w-3.5" /> Fund in cedis, spend in
              dollars
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your virtual{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                dollar card
              </span>{" "}
              for the whole internet
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Create a virtual USD card in seconds and pay for subscriptions,
              ads, shopping and APIs — funded straight from mobile money.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Create your card <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Try the live demo
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" /> Instant KYC
              </span>
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" /> PCI-minded design
              </span>
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
            <div className="animate-float relative mx-auto max-w-sm">
              <VirtualCard card={heroCard} revealed />
            </div>
            <div className="glass relative mx-auto mt-4 max-w-xs rounded-xl p-4 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Netflix</span>
                <span className="font-semibold text-foreground">-$12.99</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">OpenAI</span>
                <span className="font-semibold text-foreground">-$20.00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MerchantMarquee />

      {/* Stats */}
      <section className="border-b border-border bg-card/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
          {[
            ["GHS " + sellRate(), "per $1 · one flat rate"],
            ["< 10s", "to issue a card"],
            ["190+", "countries of merchants"],
            ["$" + CONFIG.cardIssueFee, "flat card fee"],
          ].map(([big, small]) => (
            <div key={small}>
              <p className="text-2xl font-bold text-foreground sm:text-3xl">
                {big}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Three steps to your first payment
          </h2>
          <p className="mt-3 text-muted-foreground">
            No branch, no paperwork queues. Everything happens on your phone.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="lift relative rounded-xl border border-border bg-card p-6"
            >
              <span className="absolute right-5 top-5 text-5xl font-bold text-muted/60">
                {i + 1}
              </span>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to spend globally
            </h2>
            <p className="mt-3 text-muted-foreground">
              A complete card program, built like the real thing.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="lift rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-accent/10 text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Honest, boring pricing
            </h2>
            <p className="mt-4 text-muted-foreground">
              One transparent FX rate and a flat fee per card. You always see
              exactly what you get before you confirm.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                `GHS ${sellRate()} to $1 — spread included, no hidden markup`,
                `$${CONFIG.cardIssueFee} to create a card`,
                `Minimum $${CONFIG.minCardLoad} first load`,
                "Freeze anytime — unused balance returns to your wallet",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              Example
            </p>
            <p className="mt-2 text-4xl font-bold text-foreground">
              GHS 1,240
            </p>
            <p className="text-sm text-muted-foreground">funds your wallet</p>
            <div className="my-6 h-px bg-border" />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">You receive</dt>
                <dd className="font-semibold text-foreground">
                  ~${(1240 / sellRate()).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Card creation</dt>
                <dd className="font-semibold text-foreground">
                  ${CONFIG.cardIssueFee.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rate</dt>
                <dd className="font-semibold text-foreground">
                  GHS {sellRate()} / $1
                </dd>
              </div>
            </dl>
            <Link href="/signup" className="mt-6 block">
              <Button className="w-full">Get started free</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Questions, answered
          </h2>
          <div className="mt-10 space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-border bg-card p-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-foreground">
                  {f.q}
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent p-10 text-center text-white sm:p-16">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4),transparent_40%)]" />
          <h2 className="relative text-3xl font-bold sm:text-4xl">
            Ready to spend in dollars?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/90">
            Join Dola and create your first virtual card in under a minute.
          </p>
          <Link href="/signup" className="relative mt-8 inline-block">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
            >
              Create your card <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Dola. A portfolio project — sandbox
            data only.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
