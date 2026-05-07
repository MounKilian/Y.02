"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Github, Play } from "lucide-react";
import type { Project } from "@/lib/types";

export function Projects({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="card p-8 text-center font-mono text-sm text-term-comment">
        // Aucun projet pour l'instant.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((p, i) => (
        <motion.article
          key={p.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          className="group card relative flex aspect-[4/5] flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-glow"
        >
          {/* background image / fallback */}
          <div className="absolute inset-0 -z-10">
            {p.image ? (
              <>
                <img
                  src={p.image}
                  alt=""
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/85 to-bg/30" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 [background:radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.18),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(188,140,255,0.15),transparent_45%)]" />
                <div className="absolute inset-0 scanlines opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
                <div className="absolute inset-x-0 top-0 grid h-1/2 place-items-center">
                  <span className="font-mono text-3xl font-semibold text-zinc-200/30">
                    {`<${p.title.split(" ")[0]} />`}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* terminal header */}
          <div className="flex items-center gap-2 border-b border-bg-ring/60 bg-bg/40 px-4 py-2 font-mono text-xs backdrop-blur-md">
            <span className="text-term-comment">{`//`}</span>
            <span className="text-term-comment">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-zinc-500">·</span>
            <span className="truncate text-zinc-200">{p.title.toLowerCase().replace(/\s+/g, "-")}.repo</span>
            <span className="ml-auto text-term-green">●</span>
          </div>

          {/* spacer keeps content at the bottom */}
          <div className="flex-1" />

          {/* content overlay */}
          <div className="space-y-3 bg-gradient-to-t from-bg/95 via-bg/85 to-transparent p-5 backdrop-blur-[2px]">
            <div>
              <h3 className="font-mono text-lg font-semibold text-white">{p.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-300">{p.description}</p>
            </div>

            {p.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.technologies.slice(0, 5).map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-xs">
              {p.playUrl ? (
                <Link
                  href={`/play/${p.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/15 px-2.5 py-1 text-accent transition hover:bg-accent/25"
                >
                  <Play size={13} /> play
                </Link>
              ) : null}
              {p.githubUrl ? (
                <a
                  href={p.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-zinc-300 transition hover:text-accent"
                >
                  <Github size={14} /> git clone
                </a>
              ) : null}
              {p.demoUrl ? (
                <a
                  href={p.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-accent-soft transition hover:text-accent-glow"
                >
                  <ExternalLink size={14} /> open_demo
                </a>
              ) : null}
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
