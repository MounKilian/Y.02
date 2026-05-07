"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { Skill, SkillCategory } from "@/lib/types";

const CATEGORIES: SkillCategory[] = ["Frontend", "Backend", "DevOps", "Tools", "Other"];

type FormState = {
  id: string | null;
  name: string;
  category: SkillCategory;
  level: number;
};

const empty: FormState = { id: null, name: "", category: "Frontend", level: 3 };

export default function SkillsAdminPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const res = await fetch("/api/skills");
    setSkills(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function startNew() {
    setForm(empty);
    setOpen(true);
  }
  function startEdit(s: Skill) {
    setForm({ id: s.id, name: s.name, category: s.category, level: s.level });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        level: form.level,
      };
      const url = form.id ? `/api/skills/${form.id}` : "/api/skills";
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec");
      toast.success(form.id ? "Compétence mise à jour" : "Compétence ajoutée");
      setOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Skill) {
    if (!confirm(`Supprimer ${s.name} ?`)) return;
    const res = await fetch(`/api/skills/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Échec");
      return;
    }
    toast.success("Compétence supprimée");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-semibold text-white">
            <span className="bracket">{"<"}</span>skills<span className="bracket">{" />"}</span>
          </h1>
          <p className="text-sm text-zinc-400">Organise tes compétences par catégorie et niveau.</p>
        </div>
        <button onClick={startNew} className="btn-primary">
          <Plus size={16} /> nouvelle compétence
        </button>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {CATEGORIES.map((cat) => {
            const items = skills.filter((s) => s.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="card p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">{cat}</h2>
                <ul className="mt-4 space-y-2">
                  {items.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-xl bg-bg-soft/50 px-3 py-2">
                      <span className="flex-1 truncate text-sm text-zinc-100">{s.name}</span>
                      <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-bg-ring">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-accent-glow"
                          style={{ width: `${(s.level / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-xs text-zinc-500">{s.level}/5</span>
                      <button onClick={() => startEdit(s)} className="btn-ghost px-2" title="Éditer">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(s)} className="btn-ghost px-2 text-red-300 hover:text-red-200" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {skills.length === 0 ? (
            <div className="card col-span-full grid place-items-center p-12 text-center">
              <p className="text-zinc-300">Aucune compétence.</p>
              <button onClick={startNew} className="btn-primary mt-4">
                <Plus size={16} /> Ajouter une compétence
              </button>
            </div>
          ) : null}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={save} className="card w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-white">
                {form.id ? "Éditer la compétence" : "Nouvelle compétence"}
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nom</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Catégorie</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as SkillCategory })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Niveau ({form.level}/5)</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                <Save size={16} /> {saving ? "..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
