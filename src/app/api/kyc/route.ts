import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/auth";
import { getFullState, submitKyc } from "@/lib/server/repo";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { idType, idNumber, dateOfBirth, address, city } = await req.json();
    if (!idType || !idNumber || !dateOfBirth || !address || !city)
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    await submitKyc(userId, { idType, idNumber, dateOfBirth, address, city });
    const state = await getFullState(userId);
    return NextResponse.json({ state });
  } catch (e) {
    console.error("kyc", e);
    return NextResponse.json({ error: "KYC failed." }, { status: 500 });
  }
}
