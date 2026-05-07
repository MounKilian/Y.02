"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Github,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { Project } from "@/lib/types";
import { ImageUpload } from "@/components/admin/ImageUpload";

type FormState = {
  id: string | null;
  title: string;
  description: string;
  technologies: string;
  githubUrl: string;
  demoUrl: string;
  playUrl: string;
  image: string;
};

const empty: FormState = {
  id: null,
  title: "",
  description: "",
  technologies: "",
  githubUrl: "",
  demoUrl: "",
  playUrl: "",
  image: "",
};

export default function ProjectsAdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function startNew() {
    setForm(empty);
    setOpen(true);
  }

  function startEdit(p: Project) {
    setForm({
      id: p.id,
      title: p.title,
      description: p.description,
      technologies: p.technologies.join(", "),
      githubUrl: p.githubUrl,
      demoUrl: p.demoUrl,
      playUrl: p.playUrl ?? "",
      image: p.image,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        technologies: form.technologies
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        githubUrl: form.githubUrl.trim(),
        demoUrl: form.demoUrl.trim(),
        playUrl: form.playUrl.trim(),
        image: form.image.trim(),
      };
      const url = form.id ? `/api/projects/${form.id}` : "/api/projects";
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'enregistrement");
      toast.success(form.id ? "Projet mis à jour" : "Projet créé");
      setOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Project) {
    if (!confirm(`Supprimer "${p.title}" ?`)) return;
    const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Échec de la suppression");
      return;
    }
    toast.success("Projet supprimé");
    await refresh();
  }

  async function move(idx: number, dir: -1 | 1) {
    const next = [...projects];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setProjects(next);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((p) => p.id) }),
    });
    if (!res.ok) {
      toast.error("Réorganisation échouée");
      await refresh();
      return;
    }
    setProjects(await res.json());
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-semibold text-white">
            <span className="bracket">{"<"}</span>projects<span className="bracket">{" />"}</span>
          </h1>
          <p className="text-sm text-zinc-400">
            Crée, édite, réorganise et supprime les projets affichés sur le portfolio.
          </p>
        </div>
        <button onClick={startNew} className="btn-primary">
          <Plus size={16} /> nouveau projet
        </button>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card grid place-items-center p-12 text-center">
          <p className="text-zinc-300">Aucun projet pour l'instant.</p>
          <button onClick={startNew} className="btn-primary mt-4">
            <Plus size={16} /> Ajouter le premier
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((p, i) => (
            <li key={p.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg-soft">
                {p.image ? (
                  <img src={p.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-xl text-zinc-500">{p.title.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-white">{p.title}</h3>
                  <span className="chip">{`#${i + 1}`}</span>
                </div>
                <p className="line-clamp-1 text-sm text-zinc-400">{p.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.technologies.slice(0, 6).map((t) => (
                    <span key={t} className="chip">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                {p.githubUrl ? (
                  <a href={p.githubUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2" title="GitHub">
                    <Github size={16} />
                  </a>
                ) : null}
                {p.demoUrl ? (
                  <a href={p.demoUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2" title="Démo">
                    <ExternalLink size={16} />
                  </a>
                ) : null}
                <button onClick={() => move(i, -1)} className="btn-ghost px-2" disabled={i === 0} title="Monter">
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  className="btn-ghost px-2"
                  disabled={i === projects.length - 1}
                  title="Descendre"
                >
                  <ArrowDown size={16} />
                </button>
                <button onClick={() => startEdit(p)} className="btn-secondary" title="Éditer">
                  <Pencil size={14} /> Éditer
                </button>
                <button onClick={() => remove(p)} className="btn-danger" title="Supprimer">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={save} className="card my-8 w-full max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-xl font-semibold text-white">
                <span className="bracket">{"<"}</span>{form.id ? "edit_project" : "new_project"}<span className="bracket">{" />"}</span>
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Titre</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea
                  className="input min-h-[100px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Technologies (séparées par des virgules)</label>
                <input
                  className="input"
                  value={form.technologies}
                  onChange={(e) => setForm({ ...form, technologies: e.target.value })}
                  placeholder="TypeScript, React, Tailwind"
                />
              </div>
              <div>
                <label className="label">URL GitHub</label>
                <input
                  className="input"
                  value={form.githubUrl}
                  onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                  placeholder="https://github.com/..."
                />
              </div>
              <div>
                <label className="label">URL démo (externe)</label>
                <input
                  className="input"
                  value={form.demoUrl}
                  onChange={(e) => setForm({ ...form, demoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">URL exécutable / iframe (Play)</label>
                <input
                  className="input"
                  value={form.playUrl}
                  onChange={(e) => setForm({ ...form, playUrl: e.target.value })}
                  placeholder="/runtime/power4-web/index.html  ou  https://..."
                />
                <p className="mt-1 font-mono text-xs text-term-comment">
                  // si renseigné, un bouton "play" embarque le projet en iframe sur /play/[id]
                </p>
              </div>
              <div className="sm:col-span-2">
                <ImageUpload
                  value={form.image}
                  onChange={(url) => setForm({ ...form, image: url })}
                  label="Image / Logo (en fond de carte)"
                  hint="formats: png, jpg, gif, webp, svg — max 5 Mo"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                annuler
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                <Save size={16} /> {saving ? "..." : "enregistrer"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
