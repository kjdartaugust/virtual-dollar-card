const MERCHANTS = [
  "Netflix",
  "Spotify",
  "OpenAI",
  "Amazon",
  "Meta Ads",
  "Google Ads",
  "AWS",
  "Steam",
  "Figma",
  "Notion",
  "Cursor",
  "Apple",
];

export function MerchantMarquee() {
  const row = [...MERCHANTS, ...MERCHANTS];
  return (
    <section className="border-y border-border bg-card/40 py-8">
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Pay any merchant that takes Visa or Mastercard
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-12 px-6">
          {row.map((m, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-xl font-semibold tracking-tight text-muted-foreground/70"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
