import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { readData, writeData } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(60),
  category: z.enum(["Frontend", "Backend", "DevOps", "Tools", "Other"]),
  level: z.number().int().min(1).max(5).default(3),
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
  if (!data.skills.find((k) => k.id === ctx.params.id)) {
    return NextResponse.json({ error: "Compétence introuvable" }, { status: 404 });
  }
  const next = await writeData((d) => {
    d.skills = d.skills.map((k) =>
      k.id === ctx.params.id ? { ...k, ...parsed.data } : k
    );
    return d;
  });
  return NextResponse.json(next.skills.find((k) => k.id === ctx.params.id));
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await writeData((d) => {
    d.skills = d.skills.filter((k) => k.id !== ctx.params.id);
    return d;
  });
  return NextResponse.json({ ok: true });
}
