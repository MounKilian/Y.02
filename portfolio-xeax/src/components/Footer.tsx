import Link from "next/link";
import type { Profile } from "@/lib/types";
import { SocialIcon } from "./Icon";

export function Footer({ profile }: { profile: Profile }) {
  const year = new Date().getFullYear();
  const socials = profile.socials.filter((s) => s.url);
  return (
    <footer className="mt-16 border-t border-bg-ring/60">
      <div className="container-x grid grid-cols-1 gap-8 py-10 sm:grid-cols-3">
        <div>
          <p className="font-mono text-sm text-white">
            <span className="text-term-comment">$ </span>
            <span className="text-accent">whoami</span>
          </p>
          <p className="mt-2 font-mono text-xs text-term-comment">{profile.name} — {profile.location}</p>
        </div>
        <div>
          <p className="font-mono text-sm text-white">
            <span className="text-term-comment">$ </span>
            <span className="text-accent">ls</span>
            <span className="text-zinc-300"> ./pages</span>
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {[
              ["/", "index"],
              ["/projects", "projects"],
              ["/skills", "skills"],
              ["/passions", "passions"],
              ["/contact", "contact"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-zinc-400 transition hover:text-accent">
                  <span className="text-term-comment">./</span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-sm text-white">
            <span className="text-term-comment">$ </span>
            <span className="text-accent">cat</span>
            <span className="text-zinc-300"> ./socials</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-zinc-400">
            {socials.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="inline-flex items-center gap-1.5 font-mono text-xs transition hover:text-accent"
              >
                <SocialIcon name={s.icon} size={14} />
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-bg-ring/60">
        <div className="container-x flex flex-wrap items-center justify-between gap-2 py-4 font-mono text-xs text-term-comment">
          <p>{`// © ${year} ${profile.name}. Built with Next.js + TypeScript + Tailwind.`}</p>
          <p>
            <span className="text-term-green">●</span> deploy: ready
          </p>
        </div>
      </div>
    </footer>
  );
}
