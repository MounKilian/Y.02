"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { LogIn, Lock, User } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-zinc-500">Chargement...</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de connexion");
      toast.success("Connecté");
      router.push(next);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-block text-sm text-zinc-400 transition hover:text-white">
          ← Retour au portfolio
        </Link>
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-bg-ring bg-bg-soft/60 px-4 py-2.5 font-mono text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-term-pink/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-term-orange/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-term-green/80" />
            <span className="ml-2 text-term-comment">auth.sh</span>
          </div>
          <div className="p-8">
          <div className="mb-6">
            <p className="font-mono text-xs text-term-comment">$ sudo login --portfolio</p>
            <h1 className="mt-2 font-mono text-xl font-semibold text-white">
              <span className="bracket">{"<"}</span>admin<span className="bracket">{" />"}</span>
            </h1>
            <p className="text-xs text-term-comment">// accès sécurisé au dashboard</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Nom d'utilisateur</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  className="input pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  className="input pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Connexion..." : (<><LogIn size={16} /> Se connecter</>)}
            </button>
          </form>
          <p className="mt-6 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-200">
            // default creds: <strong>admin</strong> / <strong>admin123</strong> — à changer dès la première connexion
          </p>
        </div>
        </div>
      </div>
    </main>
  );
}
