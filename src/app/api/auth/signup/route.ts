import { NextResponse } from "next/server";
import { createUser, getFullState, getUserByEmail } from "@/lib/server/repo";
import { hashPassword, setSessionCookie } from "@/lib/server/auth";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, phone } = await req.json();
    if (!email || !password || !fullName)
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    if (String(password).length < 6)
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    if (await getUserByEmail(email))
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );

    const passwordHash = await hashPassword(password);
    const id = await createUser({
      email,
      passwordHash,
      fullName,
      phone: phone || undefined,
    });
    await setSessionCookie(id);
    const state = await getFullState(id);
    return NextResponse.json({ state });
  } catch (e) {
    console.error("signup", e);
    return NextResponse.json({ error: "Signup failed." }, { status: 500 });
  }
}
