"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, ShieldCheck } from "lucide-react";

export default function AccountPage() {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUsername(d.user?.username ?? ""));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("Mot de passe trop court (min 6 caractères)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          currentPassword,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec");
      toast.success("Compte mis à jour");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
          <span className="bracket">{"<"}</span>account<span className="bracket">{" />"}</span>
        </h1>
        <p className="text-sm text-zinc-400">Modifie ton identifiant et ton mot de passe administrateur.</p>
      </header>

      <div className="card max-w-xl space-y-4 p-6">
        <div>
          <label className="label">Nom d'utilisateur</label>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
          />
        </div>
        <div className="border-t border-bg-ring pt-4">
          <p className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-300">
            <ShieldCheck size={14} className="text-accent-soft" /> Confirme ton mot de passe actuel pour sauvegarder.
          </p>
          <label className="label">Mot de passe actuel</label>
          <input
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="label">Nouveau mot de passe (optionnel)</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Laisser vide pour ne pas changer"
          />
        </div>
        {newPassword ? (
          <div>
            <label className="label">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        ) : null}
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save size={16} /> {saving ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </form>
  );
}
