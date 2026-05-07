import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { readData, writeData } from "@/lib/db";

const schema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  technologies: z.array(z.string().min(1).max(40)).max(30).default([]),
  githubUrl: z.string().url().or(z.literal("")).default(""),
  demoUrl: z.string().url().or(z.literal("")).default(""),
  playUrl: z.string().max(500).default(""),
  image: z.string().max(500).default(""),
});

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Champs invalides", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = await readData();
  const exists = data.projects.find((p) => p.id === ctx.params.id);
  if (!exists) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  const next = await writeData((d) => {
    d.projects = d.projects.map((p) =>
      p.id === ctx.params.id ? { ...p, ...parsed.data } : p
    );
    return d;
  });
  return NextResponse.json(next.projects.find((p) => p.id === ctx.params.id));
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await writeData((d) => {
    d.projects = d.projects.filter((p) => p.id !== ctx.params.id);
    d.projects = d.projects
      .sort((a, b) => a.order - b.order)
      .map((p, i) => ({ ...p, order: i }));
    return d;
  });
  return NextResponse.json({ ok: true });
}
