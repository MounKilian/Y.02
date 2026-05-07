"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import type { Profile } from "@/lib/types";
import { SocialIcon } from "./Icon";

export function Hero({ profile }: { profile: Profile }) {
  const initials = profile.name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="relative overflow-hidden">
      <div className="container-x relative pt-16 pb-16 sm:pt-24 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.4fr_1fr]"
        >
          <div className="flex flex-col items-start gap-5">
            <div className="flex items-center gap-3 rounded-full border border-bg-ring bg-bg-card/60 px-3 py-1 font-mono text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-term-green opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-term-green" />
              </span>
              <span className="text-zinc-300">status:</span>
              <span className="text-term-green">available_for_work</span>
            </div>

            <p className="font-mono text-sm">
              <span className="text-term-comment">// </span>
              <span className="text-accent">welcome.tsx</span>
            </p>

            <h1 className="font-mono text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              <span className="text-term-comment">const </span>
              <span className="text-term-purple">dev</span>
              <span className="text-zinc-300"> = </span>
              <span className="gradient-text">"{profile.name}"</span>
              <span className="text-zinc-500">;</span>
            </h1>

            <p className="font-mono text-base text-zinc-300 sm:text-lg">
              <span className="text-term-comment">{">"} </span>
              {profile.title}
            </p>

            {profile.subtitle ? (
              <p className="max-w-2xl text-lg leading-relaxed text-zinc-300">
                {profile.subtitle}
              </p>
            ) : null}

            {profile.bio ? (
              <p className="max-w-2xl text-zinc-400">{profile.bio}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/projects" className="btn-primary">
                <span className="text-bg/70">{">"}</span> view_projects <ArrowRight size={14} />
              </Link>
              <Link href="/contact" className="btn-secondary">
                <Mail size={14} /> contact
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-xs text-zinc-400">
              {profile.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={12} /> {profile.location}
                </span>
              ) : null}
              {profile.socials
                .filter((s) => s.url)
                .map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 transition hover:text-accent"
                    aria-label={s.label}
                  >
                    <SocialIcon name={s.icon} size={13} />
                    <span>{s.label.toLowerCase()}</span>
                  </a>
                ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-bg-ring bg-bg-soft/80 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-term-pink/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-term-orange/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-term-green/80" />
              <span className="ml-2 font-mono text-xs text-term-comment">~/dev/portfolio — zsh</span>
            </div>
            <div className="space-y-1.5 p-5 font-mono text-[13px] leading-relaxed">
              <p>
                <span className="text-term-green">noe@portfolio</span>
                <span className="text-term-comment">:</span>
                <span className="text-term-blue">~</span>
                <span className="text-term-comment">$ </span>
                <span className="text-zinc-200">whoami</span>
              </p>
              <p className="text-zinc-300">{profile.name} — {profile.location}</p>
              <p>
                <span className="text-term-green">noe@portfolio</span>
                <span className="text-term-comment">:</span>
                <span className="text-term-blue">~</span>
                <span className="text-term-comment">$ </span>
                <span className="text-zinc-200">cat /etc/role</span>
              </p>
              <p className="text-zinc-300">{profile.title}</p>
              <p>
                <span className="text-term-green">noe@portfolio</span>
                <span className="text-term-comment">:</span>
                <span className="text-term-blue">~</span>
                <span className="text-term-comment">$ </span>
                <span className="text-zinc-200">ls ~/stack</span>
              </p>
              <p className="text-term-blue">typescript/  go/  react/  next/  tailwind/  postgres/  docker/</p>
              <p>
                <span className="text-term-green">noe@portfolio</span>
                <span className="text-term-comment">:</span>
                <span className="text-term-blue">~</span>
                <span className="text-term-comment">$ </span>
                <span className="cursor text-zinc-200" />
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
