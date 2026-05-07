import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ user: null });
  const d = await readData();
  return NextResponse.json({ user: { username: d.auth.username } });
}
