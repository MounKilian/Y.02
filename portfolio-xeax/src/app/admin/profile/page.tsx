"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Save, Trash2 } from "lucide-react";
import type { Profile, Social } from "@/lib/types";

function newSocial(): Social {
  return { id: `s_${Math.random().toString(36).slice(2, 8)}`, label: "", url: "", icon: "globe" };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then(setProfile);
  }, []);

  if (!profile) {
    return <div className="skeleton h-96 w-full" />;
  }

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec");
      setProfile(data);
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <header>
        <h1 className="font-mono text-2xl font-semibold text-white">
          <span className="bracket">{"<"}</span>profile<span className="bracket">{" />"}</span>
        </h1>
        <p className="text-sm text-zinc-400">
          Ces informations sont affichées sur la page d'accueil du portfolio.
        </p>
      </header>

      <div className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className="label">Nom</label>
          <input className="input" value={profile.name} onChange={(e) => update("name", e.target.value)} required />
        </div>
        <div>
          <label className="label">Titre</label>
          <input
            className="input"
            value={profile.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Développeur @ Ynov Lyon"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Sous-titre</label>
          <input
            className="input"
            value={profile.subtitle}
            onChange={(e) => update("subtitle", e.target.value)}
            placeholder="Passionate about web development..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Bio</label>
          <textarea
            className="input min-h-[120px]"
            value={profile.bio}
            onChange={(e) => update("bio", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={profile.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="contact@example.com"
          />
        </div>
        <div>
          <label className="label">Localisation</label>
          <input
            className="input"
            value={profile.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Ynov Lyon"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Photo de profil (URL)</label>
          <input
            className="input"
            value={profile.avatar}
            onChange={(e) => update("avatar", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Liens sociaux</h2>
            <p className="text-sm text-zinc-400">GitHub, LinkedIn, portfolio personnel, etc.</p>
          </div>
          <button
            type="button"
            onClick={() => update("socials", [...profile.socials, newSocial()])}
            className="btn-secondary"
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {profile.socials.map((s, idx) => (
            <li key={s.id} className="grid grid-cols-1 gap-2 rounded-xl bg-bg-soft/40 p-3 sm:grid-cols-[1fr_2fr_140px_auto]">
              <input
                className="input"
                placeholder="Label"
                value={s.label}
                onChange={(e) => {
                  const next = [...profile.socials];
                  next[idx] = { ...s, label: e.target.value };
                  update("socials", next);
                }}
              />
              <input
                className="input"
                placeholder="https://..."
                value={s.url}
                onChange={(e) => {
                  const next = [...profile.socials];
                  next[idx] = { ...s, url: e.target.value };
                  update("socials", next);
                }}
              />
              <select
                className="input"
                value={s.icon}
                onChange={(e) => {
                  const next = [...profile.socials];
                  next[idx] = { ...s, icon: e.target.value };
                  update("socials", next);
                }}
              >
                {["github", "linkedin", "twitter", "globe", "mail", "youtube", "instagram", "telegram"].map((ic) => (
                  <option key={ic} value={ic}>{ic}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => update("socials", profile.socials.filter((_, i) => i !== idx))}
                className="btn-danger"
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {profile.socials.length === 0 ? (
            <li className="rounded-xl border border-dashed border-bg-ring p-6 text-center text-sm text-zinc-500">
              Aucun lien social pour l'instant.
            </li>
          ) : null}
        </ul>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary">
          <Save size={16} /> {saving ? "Enregistrement..." : "Enregistrer le profil"}
        </button>
      </div>
    </form>
  );
}
