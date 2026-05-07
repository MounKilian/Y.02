import { getPublicData } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Skills } from "@/components/Skills";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const data = await getPublicData();
  return (
    <>
      <PageHeader
        cmd="cat ./stack.json"
        tag="skills"
        title="skills"
        description="Le stack avec lequel je code, classé par domaine et niveau de maîtrise."
      />
      <section className="container-x pb-16">
        <Skills skills={data.skills} />
      </section>
    </>
  );
}
