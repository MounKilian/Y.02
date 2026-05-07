import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { readData } from "@/lib/db";
import { setSessionCookie, signSession } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Champs invalides" }, { status: 400 });
  }
  const { username, password } = parsed.data;
  const data = await readData();
  if (data.auth.username !== username) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, data.auth.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }
  const token = await signSession(username);
  const res = NextResponse.json({ ok: true, username });
  setSessionCookie(res, token);
  return res;
}
