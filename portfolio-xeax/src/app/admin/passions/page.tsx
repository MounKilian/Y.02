"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Save, Trash2, Gamepad2, Music } from "lucide-react";
import type { GamingItem, MusicItem, Passions } from "@/lib/types";
import { ImageUpload } from "@/components/admin/ImageUpload";

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

function newGaming(): GamingItem {
  return {
    id: rid("g"),
    game: "",
    platform: "",
    username: "",
    url: "",
    rank: "",
    accent: "#22d3ee",
    image: "",
  };
}

function newMusic(): MusicItem {
  return {
    id: rid("m"),
    type: "album",
    title: "",
    artist: "",
    url: "",
    coverUrl: "",
    note: "",
  };
}

export default function PassionsAdminPage() {
  const [data, setData] = useState<Passions | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/passions").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="skeleton h-96 w-full" />;

  function patchGaming(idx: number, patch: Partial<GamingItem>) {
    if (!data) return;
    const next = data.gaming.map((g, i) => (i === idx ? { ...g, ...patch } : g));
    setData({ ...data, gaming: next });
  }
  function patchMusic(idx: number, patch: Partial<MusicItem>) {
    if (!data) return;
    const next = data.music.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    setData({ ...data, music: next });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/passions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const next = await res.json();
      if (!res.ok) throw new Error(next.error || "Échec");
      setData(next);
      toast.success("Passions mises à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-8">
      <header>
        <h1 className="font-mono text-2xl font-semibold text-white">
          <span className="bracket">{"<"}</span>passions<span className="bracket">{" />"}</span>
        </h1>
        <p className="text-sm text-zinc-400">Gère ta section gaming et musique affichée sur /passions.</p>
      </header>

      <div className="card p-5">
        <label className="label">Intro</label>
        <textarea
          className="input min-h-[80px]"
          value={data.intro}
          onChange={(e) => setData({ ...data, intro: e.target.value })}
          placeholder="Quand je ne code pas, je..."
        />
      </div>

      {/* GAMING */}
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 size={18} className="text-accent" />
            <h2 className="font-mono text-lg font-semibold text-white">gaming</h2>
            <span className="chip">{data.gaming.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setData({ ...data, gaming: [...data.gaming, newGaming()] })}
            className="btn-secondary"
          >
            <Plus size={14} /> ajouter
          </button>
        </header>
        <ul className="space-y-3">
          {data.gaming.map((g, i) => (
            <li key={g.id} className="card grid grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_1fr]">
              <ImageUpload
                value={g.image}
                onChange={(url) => patchGaming(i, { image: url })}
                label="Image / Logo du jeu"
                aspect="aspect-video"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Jeu</label>
                  <input className="input" value={g.game} onChange={(e) => patchGaming(i, { game: e.target.value })} placeholder="Counter-Strike 2" required />
                </div>
                <div>
                  <label className="label">Plateforme</label>
                  <input className="input" value={g.platform} onChange={(e) => patchGaming(i, { platform: e.target.value })} placeholder="Faceit" required />
                </div>
                <div>
                  <label className="label">Username / Tag</label>
                  <input className="input" value={g.username} onChange={(e) => patchGaming(i, { username: e.target.value })} placeholder="Xeax" />
                </div>
                <div>
                  <label className="label">Rang / Niveau</label>
                  <input className="input" value={g.rank} onChange={(e) => patchGaming(i, { rank: e.target.value })} placeholder="Champion II" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">URL profil</label>
                  <input className="input" value={g.url} onChange={(e) => patchGaming(i, { url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="flex items-end gap-3 sm:col-span-2">
                  <div className="flex-1">
                    <label className="label">Couleur accent</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={g.accent || "#22d3ee"}
                        onChange={(e) => patchGaming(i, { accent: e.target.value })}
                        className="h-10 w-12 cursor-pointer rounded-md border border-bg-ring bg-bg-soft"
                      />
                      <input
                        className="input"
                        value={g.accent}
                        onChange={(e) => patchGaming(i, { accent: e.target.value })}
                        placeholder="#22d3ee"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setData({ ...data, gaming: data.gaming.filter((_, idx) => idx !== i) })}
                    className="btn-danger"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {data.gaming.length === 0 ? (
            <li className="card grid place-items-center p-6 text-center font-mono text-sm text-term-comment">
              // aucun jeu pour l'instant
            </li>
          ) : null}
        </ul>
      </section>

      {/* MUSIC */}
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-accent" />
            <h2 className="font-mono text-lg font-semibold text-white">music</h2>
            <span className="chip">{data.music.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setData({ ...data, music: [...data.music, newMusic()] })}
            className="btn-secondary"
          >
            <Plus size={14} /> ajouter
          </button>
        </header>
        <ul className="space-y-3">
          {data.music.map((m, i) => (
            <li key={m.id} className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label">Type</label>
                <select
                  className="input"
                  value={m.type}
                  onChange={(e) => patchMusic(i, { type: e.target.value as MusicItem["type"] })}
                >
                  <option value="album">album</option>
                  <option value="playlist">playlist</option>
                  <option value="artist">artist</option>
                  <option value="track">track</option>
                </select>
              </div>
              <div>
                <label className="label">Titre</label>
                <input className="input" value={m.title} onChange={(e) => patchMusic(i, { title: e.target.value })} placeholder="Currents" required />
              </div>
              <div>
                <label className="label">Artiste</label>
                <input className="input" value={m.artist} onChange={(e) => patchMusic(i, { artist: e.target.value })} placeholder="Tame Impala" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="label">URL Spotify</label>
                <input className="input" value={m.url} onChange={(e) => patchMusic(i, { url: e.target.value })} placeholder="https://open.spotify.com/album/..." />
                <p className="mt-1 font-mono text-xs text-term-comment">// l'embed Spotify est généré automatiquement à partir de l'URL</p>
              </div>
              <div className="lg:col-span-2">
                <label className="label">Cover (URL — optionnel)</label>
                <input className="input" value={m.coverUrl} onChange={(e) => patchMusic(i, { coverUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="label">Note perso</label>
                  <input className="input" value={m.note} onChange={(e) => patchMusic(i, { note: e.target.value })} placeholder="L'album qui..." />
                </div>
                <button
                  type="button"
                  onClick={() => setData({ ...data, music: data.music.filter((_, idx) => idx !== i) })}
                  className="btn-danger"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
          {data.music.length === 0 ? (
            <li className="card grid place-items-center p-6 text-center font-mono text-sm text-term-comment">
              // aucune musique pour l'instant
            </li>
          ) : null}
        </ul>
      </section>

      <div className="flex justify-end pb-4">
        <button type="submit" disabled={saving} className="btn-primary">
          <Save size={14} /> {saving ? "Enregistrement..." : "Enregistrer les passions"}
        </button>
      </div>
    </form>
  );
}
