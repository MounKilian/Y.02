import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { newId, readData, writeData } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(60),
  category: z.enum(["Frontend", "Backend", "DevOps", "Tools", "Other"]),
  level: z.number().int().min(1).max(5).default(3),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await readData();
  return NextResponse.json(d.skills);
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Champs invalides", issues: parsed.error.flatten() }, { status: 400 });
  }
  const next = await writeData((d) => {
    d.skills.push({ id: newId("k"), ...parsed.data });
    return d;
  });
  return NextResponse.json(next.skills);
}
