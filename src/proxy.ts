import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CORS for the API the Susu app calls cross-origin (native app and the web
// build on another domain). These routes authenticate with a Bearer token, not
// cookies, so a permissive origin is safe: no credentialed cookie requests are
// enabled, and Dola's own same-origin calls are unaffected by CORS.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,authorization",
  "Access-Control-Max-Age": "86400",
};

export function proxy(request: NextRequest) {
  // Answer the browser's preflight directly.
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS });
  }
  const response = NextResponse.next();
  for (const [k, v] of Object.entries(CORS)) response.headers.set(k, v);
  return response;
}

export const config = {
  matcher: ["/api/susu/:path*", "/api/auth/:path*"],
};
