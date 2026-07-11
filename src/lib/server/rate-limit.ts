import "server-only";

// Fixed-window rate limiter, in memory.
//
// Deliberately not Redis: this guards a handful of sensitive endpoints (card
// reveal) against a user hammering them, not a distributed attack. Vercel may
// run several instances, so the real ceiling is (limit × instances) — still a
// hard bound on abuse, and no extra infrastructure. Swap in Upstash if you ever
// need an exact global limit.
type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();

// Keep the map from growing without bound on a long-lived instance.
function sweep(now: number) {
  if (windows.size < 1000) return;
  for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);
  const w = windows.get(key);

  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (w.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((w.resetAt - now) / 1000)),
    };
  }
  w.count++;
  return { ok: true, retryAfterSec: 0 };
}
