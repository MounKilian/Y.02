import { NextResponse } from "next/server";
import { getPublicData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getPublicData();
  return NextResponse.json(data);
}
