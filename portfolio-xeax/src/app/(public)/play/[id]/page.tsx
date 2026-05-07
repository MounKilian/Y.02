import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Github, Maximize2 } from "lucide-react";
import { getPublicData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: { id: string } }) {
  const data = await getPublicData();
  const project = data.projects.find((p) => p.id === params.id);
  if (!project || !project.playUrl) notFound();

  return (
    <div className="container-x py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/projects" className="inline-flex items-center gap-2 font-mono text-sm text-zinc-400 transition hover:text-accent">
          <ArrowLeft size={14} /> back to projects
        </Link>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {project.githubUrl ? (
            <a href={project.githubUrl} target="_blank" rel="noreferrer" className="btn-secondary">
              <Github size={14} /> source
            </a>
          ) : null}
          {project.demoUrl ? (
            <a href={project.demoUrl} target="_blank" rel="noreferrer" className="btn-secondary">
              <ExternalLink size={14} /> external_demo
            </a>
          ) : null}
          <a href={project.playUrl} target="_blank" rel="noreferrer" className="btn-primary">
            <Maximize2 size={14} /> open_fullscreen
          </a>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-bg-ring bg-bg-soft/60 px-4 py-2.5 font-mono text-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-term-pink/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-term-orange/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-term-green/80" />
          <span className="ml-2 text-term-comment">{project.title.toLowerCase().replace(/\s+/g, "-")} — sandbox</span>
          <span className="ml-auto text-zinc-300">{project.playUrl}</span>
        </div>
        <iframe
          src={project.playUrl}
          title={project.title}
          className="block h-[78vh] w-full border-0 bg-bg"
          allow="autoplay; fullscreen; gamepad; accelerometer; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-modals"
        />
      </div>

      <p className="mt-3 font-mono text-xs text-term-comment">
        // certaines pages tierces refusent l'embed (X-Frame-Options) — utilise "open_fullscreen" si rien ne s'affiche.
      </p>
    </div>
  );
}
