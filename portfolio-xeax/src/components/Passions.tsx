"use client";
import { motion } from "framer-motion";
import { ExternalLink, Gamepad2, Music, Disc3, ListMusic, User as UserIcon, type LucideIcon } from "lucide-react";
import type { GamingItem, MusicItem, Passions as PassionsType } from "@/lib/types";

const TYPE_ICONS: Record<MusicItem["type"], LucideIcon> = {
  album: Disc3,
  playlist: ListMusic,
  artist: UserIcon,
  track: Music,
};

function spotifyEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("spotify.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [type, id] = parts.slice(-2);
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

export function Passions({ data }: { data: PassionsType }) {
  return (
    <div className="space-y-12">
      {data.intro ? (
        <p className="max-w-2xl text-zinc-300">{data.intro}</p>
      ) : null}

      <PassionGaming items={data.gaming} />
      <PassionMusic items={data.music} />
    </div>
  );
}

function PassionGaming({ items }: { items: GamingItem[] }) {
  return (
    <section id="gaming">
      <header className="mb-5 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-bg-ring bg-bg-card text-accent">
          <Gamepad2 size={18} />
        </div>
        <div>
          <p className="section-tag"><span className="text-term-comment">// </span>gaming</p>
          <h2 className="font-mono text-xl font-semibold text-white">
            <span className="bracket">{"<"}</span>games<span className="bracket">{" />"}</span>
          </h2>
        </div>
      </header>
      {items.length === 0 ? (
        <div className="card p-6 text-center font-mono text-sm text-term-comment">// nothing here yet</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((g, i) => {
            const accent = g.accent || "#22d3ee";
            return (
              <motion.a
                key={g.id}
                href={g.url || undefined}
                target={g.url ? "_blank" : undefined}
                rel="noreferrer"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="card group relative flex aspect-[4/3] flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-accent/50"
              >
                {/* background */}
                <div className="absolute inset-0 -z-10">
                  {g.image ? (
                    <>
                      <img
                        src={g.image}
                        alt=""
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/20" />
                    </>
                  ) : (
                    <div
                      className="absolute inset-0 opacity-25 blur-2xl"
                      style={{ background: `radial-gradient(circle at 30% 30%, ${accent}, transparent 60%)` }}
                    />
                  )}
                </div>

                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60"
                  style={{ background: accent }}
                />

                {/* top header */}
                <div className="flex items-start justify-between p-4">
                  <span className="rounded-md border border-bg-ring/70 bg-bg/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-200 backdrop-blur-md">
                    {g.platform}
                  </span>
                  <ExternalLink
                    size={16}
                    className="text-zinc-200 opacity-70 transition group-hover:text-accent group-hover:opacity-100"
                  />
                </div>

                <div className="flex-1" />

                {/* content overlay */}
                <div className="space-y-1.5 bg-gradient-to-t from-bg/95 via-bg/80 to-transparent p-4 pt-8 backdrop-blur-[2px]">
                  <h3 className="font-mono text-lg font-semibold text-white">{g.game}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
                    {g.username ? (
                      <span className="text-zinc-200">
                        <span className="text-term-comment">@</span>
                        {g.username}
                      </span>
                    ) : null}
                    {g.rank ? (
                      <span className="inline-flex items-center gap-1.5 text-zinc-300">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: accent }}
                        />
                        {g.rank}
                      </span>
                    ) : null}
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PassionMusic({ items }: { items: MusicItem[] }) {
  return (
    <section id="music">
      <header className="mb-5 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-bg-ring bg-bg-card text-accent">
          <Music size={18} />
        </div>
        <div>
          <p className="section-tag"><span className="text-term-comment">// </span>music</p>
          <h2 className="font-mono text-xl font-semibold text-white">
            <span className="bracket">{"<"}</span>music<span className="bracket">{" />"}</span>
          </h2>
        </div>
      </header>
      {items.length === 0 ? (
        <div className="card p-6 text-center font-mono text-sm text-term-comment">// silence</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m, i) => {
            const Icon = TYPE_ICONS[m.type];
            const embed = spotifyEmbedUrl(m.url);
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="card overflow-hidden"
              >
                {embed ? (
                  <iframe
                    src={embed}
                    title={m.title}
                    width="100%"
                    height="152"
                    frameBorder={0}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="block w-full"
                  />
                ) : (
                  <div className="aspect-[16/9] w-full overflow-hidden bg-bg-soft">
                    {m.coverUrl ? (
                      <img src={m.coverUrl} alt={m.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center font-mono text-sm text-term-comment">
                        <Icon size={28} />
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-term-comment">
                      <Icon size={12} /> {m.type}
                    </span>
                    {m.url ? (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-accent-soft transition hover:text-accent-glow"
                      >
                        spotify ↗
                      </a>
                    ) : null}
                  </div>
                  <h3 className="font-mono text-base font-semibold text-white">{m.title}</h3>
                  {m.artist ? <p className="text-sm text-zinc-300">{m.artist}</p> : null}
                  {m.note ? (
                    <p className="font-mono text-xs text-term-comment">// {m.note}</p>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
