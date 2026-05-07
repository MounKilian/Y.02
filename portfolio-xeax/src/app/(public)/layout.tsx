import { getPublicData } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const data = await getPublicData();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar name={data.profile.name} />
      <main className="flex-1">{children}</main>
      <Footer profile={data.profile} />
    </div>
  );
}
