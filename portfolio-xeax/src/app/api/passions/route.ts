import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { readData, writeData } from "@/lib/db";

const gaming = z.object({
  id: z.string().min(1),
  game: z.string().min(1).max(80),
  platform: z.string().min(1).max(80),
  username: z.string().max(80).default(""),
  url: z.string().url().or(z.literal("")).default(""),
  rank: z.string().max(80).default(""),
  accent: z.string().max(40).default(""),
  image: z.string().max(500).default(""),
});

const music = z.object({
  id: z.string().min(1),
  type: z.enum(["album", "playlist", "artist", "track"]),
  title: z.string().min(1).max(120),
  artist: z.string().max(120).default(""),
  url: z.string().url().or(z.literal("")).default(""),
  coverUrl: z.string().max(500).default(""),
  note: z.string().max(400).default(""),
});

const schema = z.object({
  intro: z.string().max(400).default(""),
  gaming: z.array(gaming).max(40),
  music: z.array(music).max(60),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await readData();
  return NextResponse.json(d.passions);
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
    d.passions = parsed.data;
    return d;
  });
  return NextResponse.json(next.passions);
}
