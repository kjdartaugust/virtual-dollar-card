"use client";

import type { Card } from "@/lib/types";
import { cn, formatUSD, groupCardNumber, maskCardNumber } from "@/lib/utils";
import { Copy, Snowflake, Wifi } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useRef, useState } from "react";

export const CARD_COLORS: Record<string, string> = {
  aurora: "from-emerald-500 via-teal-600 to-indigo-700",
  midnight: "from-slate-700 via-slate-900 to-black",
  sunset: "from-orange-500 via-rose-600 to-purple-700",
  ocean: "from-sky-500 via-blue-600 to-indigo-800",
  forest: "from-lime-500 via-emerald-700 to-green-900",
  royal: "from-violet-600 via-purple-700 to-fuchsia-800",
};

function BrandMark({ brand }: { brand: Card["brand"] }) {
  if (brand === "mastercard") {
    return (
      <div className="flex items-center drop-shadow">
        <span className="h-7 w-7 rounded-full bg-[#eb001b]" />
        <span className="-ml-3.5 h-7 w-7 rounded-full bg-[#f79e1b] mix-blend-hard-light" />
      </div>
    );
  }
  return (
    <span className="text-2xl font-bold italic tracking-tighter text-white drop-shadow">
      VISA
    </span>
  );
}

export function VirtualCard({
  card,
  revealed = false,
  interactive = true,
  className,
}: {
  card: Card;
  revealed?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 0 });
  const gradient = CARD_COLORS[card.color] ?? CARD_COLORS.aurora;
  const frozen = card.status === "frozen";
  const terminated = card.status === "terminated";

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({
      ry: (px - 0.5) * 16,
      rx: (0.5 - py) * 16,
      gx: px * 100,
      gy: py * 100,
    });
  };

  const reset = () => setTilt({ rx: 0, ry: 0, gx: 50, gy: 0 });

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      toast(`${label} copied`, "success");
    } catch {
      toast("Couldn't copy", "error");
    }
  };

  return (
    <div className="[perspective:1200px]">
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: "transform 0.25s var(--ease-out)",
        }}
        className={cn(
          "grain relative aspect-[1.585/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-[var(--shadow-xl)] will-change-transform card-sheen",
          gradient,
          (frozen || terminated) && "grayscale-[0.65]",
          className
        )}
      >
        {/* specular highlight following the cursor */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity"
          style={{
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.4), transparent 45%)`,
            opacity: interactive ? 0.9 : 0.3,
          }}
        />
        {/* soft top corner sheen */}
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.5),transparent_45%)]" />

        <div className="relative flex h-full flex-col justify-between [transform:translateZ(40px)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
                {card.label}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight tabular drop-shadow-sm">
                {formatUSD(card.balance)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {frozen && <Snowflake className="h-5 w-5 text-white/90" />}
              <Wifi className="h-5 w-5 rotate-90 text-white/80" />
            </div>
          </div>

          {/* EMV chip */}
          <div className="flex items-center">
            <div className="relative h-8 w-11 rounded-md bg-gradient-to-br from-yellow-100 via-yellow-300 to-yellow-500 shadow-inner">
              <div className="absolute inset-0 grid grid-cols-3 gap-px p-1 opacity-50">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="rounded-[1px] bg-yellow-800/40" />
                ))}
              </div>
              <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-yellow-800/30" />
            </div>
          </div>

          <button
            onClick={() => revealed && copy(card.pan, "Card number")}
            className={cn(
              "text-left font-mono text-lg tracking-[0.2em] drop-shadow-sm sm:text-xl",
              revealed && "hover:text-white/90"
            )}
          >
            {revealed ? groupCardNumber(card.pan) : maskCardNumber(card.pan)}
          </button>

          <div className="flex items-end justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Card holder
              </p>
              <p className="text-sm font-medium tracking-wide">
                {card.cardholder}
              </p>
            </div>
            <div className="flex items-end gap-4">
              <div className="space-y-0.5 text-right">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Exp
                </p>
                <p className="font-mono text-sm tabular">
                  {String(card.expMonth).padStart(2, "0")}/
                  {String(card.expYear).slice(-2)}
                </p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  CVV
                </p>
                <p className="font-mono text-sm tabular">
                  {revealed ? card.cvv : "•••"}
                </p>
              </div>
              <BrandMark brand={card.brand} />
            </div>
          </div>
        </div>

        {revealed && (
          <button
            onClick={() => copy(card.pan, "Card number")}
            className="absolute right-4 top-4 rounded-lg bg-white/15 p-1.5 backdrop-blur transition-colors hover:bg-white/25"
            aria-label="Copy card number"
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
