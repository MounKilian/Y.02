import Link from "next/link";
import { getPublicData } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Passions } from "@/components/Passions";

export const dynamic = "force-dynamic";

export default async function PassionsPage() {
  const data = await getPublicData();
  return (
    <>
      <PageHeader
        cmd="open ./passions"
        tag="passions"
        title="passions"
        description="Le code, c'est ma passion principale — mais loin d'être la seule. Voici ce qui m'occupe l'esprit en dehors de l'éditeur."
      />
      <section className="container-x pb-8">
        <div className="mb-8 flex flex-wrap gap-2 font-mono text-sm">
          <Link href="#gaming" className="chip transition hover:border-accent/60 hover:text-accent">
            <span className="text-term-comment">#</span>gaming
          </Link>
          <Link href="#music" className="chip transition hover:border-accent/60 hover:text-accent">
            <span className="text-term-comment">#</span>music
          </Link>
        </div>
        <Passions data={data.passions} />
      </section>
    </>
  );
}
