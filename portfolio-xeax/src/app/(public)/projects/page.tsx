import { getPublicData } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { Projects } from "@/components/Projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const data = await getPublicData();
  return (
    <>
      <PageHeader
        cmd="ls -la ./projects"
        tag="projects"
        title="projects"
        description="Réalisations personnelles et scolaires — du jeu en TypeScript à des applications Go."
      />
      <section className="container-x pb-16">
        <Projects projects={data.projects} />
      </section>
    </>
  );
}
