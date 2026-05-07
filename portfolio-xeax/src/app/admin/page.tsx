import Link from "next/link";
import { ArrowRight, FolderGit2, Sparkles, UserCircle2, KeyRound, Heart } from "lucide-react";
import { readData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const d = await readData();
  const stats = [
    { label: "projects", value: d.projects.length, href: "/admin/projects", icon: FolderGit2 },
    { label: "skills", value: d.skills.length, href: "/admin/skills", icon: Sparkles },
    { label: "passions", value: d.passions.gaming.length + d.passions.music.length, href: "/admin/passions", icon: Heart },
    { label: "socials", value: d.profile.socials.filter((s) => s.url).length, href: "/admin/profile", icon: UserCircle2 },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-sm">
          <span className="text-term-green">noe@portfolio</span>
          <span className="text-term-comment">:</span>
          <span className="text-term-blue">~/admin</span>
          <span className="text-term-comment">$ </span>
          <span className="text-zinc-200">status --all</span>
        </p>
        <h1 className="mt-2 font-mono text-3xl font-semibold text-white">
          <span className="bracket">{"<"}</span>dashboard<span className="bracket">{" />"}</span>
        </h1>
        <p className="mt-1 text-zinc-400">
          Bienvenue <span className="text-accent">{d.profile.name}</span>. Gère ici le contenu de ton portfolio en temps réel.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="card group flex items-center justify-between p-5 transition hover:-translate-y-0.5 hover:border-accent/50"
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-term-comment">// {s.label}</p>
                <p className="mt-2 font-mono text-3xl font-semibold text-white">{s.value}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-md border border-bg-ring bg-bg-soft text-accent transition group-hover:border-accent/50">
                <Icon size={16} />
              </div>
            </Link>
          );
        })}
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-mono text-lg font-semibold text-white">
            <span className="bracket">{"<"}</span>quick_actions<span className="bracket">{" />"}</span>
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Modifie tes contenus en quelques clics.</p>
          <ul className="mt-4 space-y-1">
            {[
              { href: "/admin/projects", label: "ajouter / éditer un projet", icon: FolderGit2 },
              { href: "/admin/skills", label: "gérer les compétences", icon: Sparkles },
              { href: "/admin/passions", label: "mettre à jour gaming & musique", icon: Heart },
              { href: "/admin/profile", label: "mettre à jour le profil", icon: UserCircle2 },
              { href: "/admin/account", label: "changer le mot de passe", icon: KeyRound },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    className="flex items-center justify-between rounded-md px-3 py-2 font-mono text-sm text-zinc-200 transition hover:bg-bg-soft hover:text-accent"
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon size={14} className="text-accent" />
                      {a.label}
                    </span>
                    <ArrowRight size={14} className="text-term-comment" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="font-mono text-lg font-semibold text-white">
            <span className="bracket">{"<"}</span>live_preview<span className="bracket">{" />"}</span>
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Le portfolio public reflète les changements immédiatement après sauvegarde.
          </p>
          <div className="mt-4 overflow-hidden rounded-md border border-bg-ring">
            <iframe
              src="/"
              title="Aperçu portfolio"
              className="h-[420px] w-full bg-bg"
            />
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="btn-secondary mt-4">
            ouvrir dans un nouvel onglet <ArrowRight size={14} />
          </a>
        </div>
      </section>
    </div>
  );
}
