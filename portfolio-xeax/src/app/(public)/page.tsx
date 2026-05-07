import Link from "next/link";
import { ArrowRight, FolderGit2, Sparkles, Heart, Mail } from "lucide-react";
import { getPublicData } from "@/lib/db";
import { Hero } from "@/components/Hero";
import { Projects } from "@/components/Projects";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const data = await getPublicData();
  const featured = data.projects.slice(0, 3);

  const cards = [
    {
      href: "/projects",
      icon: FolderGit2,
      title: "projects",
      desc: "Une sélection de mes réalisations en TypeScript, Go et plus.",
      cmd: "ls ./projects",
    },
    {
      href: "/skills",
      icon: Sparkles,
      title: "skills",
      desc: "La stack avec laquelle je travaille au quotidien.",
      cmd: "cat ./stack.json",
    },
    {
      href: "/passions",
      icon: Heart,
      title: "passions",
      desc: "Ce qui m'anime hors du code : gaming, musique, etc.",
      cmd: "open ./passions",
    },
    {
      href: "/contact",
      icon: Mail,
      title: "contact",
      desc: "Pour discuter d'un projet, d'un stage ou juste dire bonjour.",
      cmd: "echo $EMAIL",
    },
  ];

  return (
    <>
      <Hero profile={data.profile} />

      <section className="container-x py-12">
        <p className="section-tag">
          <span className="text-term-comment">// </span>
          <span className="text-accent">explore</span>
        </p>
        <h2 className="mt-2 font-mono text-2xl font-semibold text-white sm:text-3xl">
          <span className="bracket">{"<"}</span>map<span className="bracket">{" />"}</span>
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.href}
                href={c.href}
                className="card group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:border-accent/50"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-md border border-bg-ring bg-bg-soft text-accent">
                    <Icon size={16} />
                  </div>
                  <ArrowRight size={14} className="text-term-comment transition group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                <div>
                  <p className="font-mono text-xs text-term-comment">$ {c.cmd}</p>
                  <h3 className="mt-1 font-mono text-lg font-semibold text-white">
                    <span className="bracket">{"<"}</span>{c.title}<span className="bracket">{" />"}</span>
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">{c.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="container-x py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="section-tag">
                <span className="text-term-comment">// </span>
                <span className="text-accent">featured</span>
              </p>
              <h2 className="mt-2 font-mono text-2xl font-semibold text-white sm:text-3xl">
                <span className="bracket">{"<"}</span>recent_projects<span className="bracket">{" />"}</span>
              </h2>
            </div>
            <Link href="/projects" className="btn-secondary">
              tout voir <ArrowRight size={14} />
            </Link>
          </div>
          <Projects projects={featured} />
        </section>
      ) : null}
    </>
  );
}
