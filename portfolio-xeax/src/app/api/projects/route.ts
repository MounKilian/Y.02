import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { newId, readData, writeData } from "@/lib/db";

const projectSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  technologies: z.array(z.string().min(1).max(40)).max(30).default([]),
  githubUrl: z.string().url().or(z.literal("")).default(""),
  demoUrl: z.string().url().or(z.literal("")).default(""),
  playUrl: z.string().max(500).default(""),
  image: z.string().max(500).default(""),
});

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await readData();
  return NextResponse.json([...d.projects].sort((a, b) => a.order - b.order));
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (body && Array.isArray(body.ids)) {
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Champs invalides" }, { status: 400 });
    }
    const next = await writeData((d) => {
      const map = new Map(parsed.data.ids.map((id, i) => [id, i]));
      d.projects = d.projects.map((p) => ({ ...p, order: map.get(p.id) ?? p.order }));
      return d;
    });
    return NextResponse.json([...next.projects].sort((a, b) => a.order - b.order));
  }

  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Champs invalides", issues: parsed.error.flatten() }, { status: 400 });
  }
  const next = await writeData((d) => {
    const order = d.projects.length
      ? Math.max(...d.projects.map((p) => p.order)) + 1
      : 0;
    d.projects.push({ id: newId("p"), order, ...parsed.data });
    return d;
  });
  return NextResponse.json([...next.projects].sort((a, b) => a.order - b.order));
}
