import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { readData, writeData } from "@/lib/db";

const social = z.object({
  id: z.string(),
  label: z.string().min(1).max(40),
  url: z.string().url().or(z.literal("")),
  icon: z.string().min(1).max(40),
});

const schema = z.object({
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).default(""),
  bio: z.string().max(2000).default(""),
  email: z.string().email().or(z.literal("")).default(""),
  location: z.string().max(80).default(""),
  avatar: z.string().max(500).default(""),
  socials: z.array(social).max(20).default([]),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await readData();
  return NextResponse.json(d.profile);
}

export async function PUT(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Champs invalides", issues: parsed.error.flatten() }, { status: 400 });
  }
  const next = await writeData((d) => {
    d.profile = parsed.data;
    return d;
  });
  return NextResponse.json(next.profile);
}
