import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSession, signSession, setSessionCookie } from "@/lib/auth";
import { readData, writeData } from "@/lib/db";

const schema = z.object({
  username: z.string().min(3).max(40).optional(),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(120).optional(),
});

export async function PUT(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Champs invalides" }, { status: 400 });
  }
  const { username, currentPassword, newPassword } = parsed.data;
  const current = await readData();
  const ok = await bcrypt.compare(currentPassword, current.auth.passwordHash);
  if (!ok) return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });

  let nextUsername = current.auth.username;
  let nextHash = current.auth.passwordHash;
  if (username && username !== current.auth.username) nextUsername = username;
  if (newPassword) nextHash = await bcrypt.hash(newPassword, 10);

  await writeData((d) => {
    d.auth.username = nextUsername;
    d.auth.passwordHash = nextHash;
    return d;
  });

  const token = await signSession(nextUsername);
  const res = NextResponse.json({ ok: true, username: nextUsername });
  setSessionCookie(res, token);
  return res;
}
