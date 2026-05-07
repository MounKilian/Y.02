import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { readData } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const data = await readData();
  return <AdminShell username={data.auth.username}>{children}</AdminShell>;
}
