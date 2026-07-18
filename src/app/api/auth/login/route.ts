import { NextResponse } from "next/server";
import { getFullState, getUserByEmail } from "@/lib/server/repo";
import { setSessionCookie, verifyPassword } from "@/lib/server/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const user = await getUserByEmail(email ?? "");
    if (!user || !(await verifyPassword(password ?? "", user.password_hash)))
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    const token = await setSessionCookie(user.id);
    const state = await getFullState(user.id);
    return NextResponse.json({ state, token });
  } catch (e) {
    console.error("login", e);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
