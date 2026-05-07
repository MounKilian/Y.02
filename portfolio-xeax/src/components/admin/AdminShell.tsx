"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  Sparkles,
  UserCircle2,
  KeyRound,
  Eye,
  LogOut,
  Heart,
} from "lucide-react";
import toast from "react-hot-toast";

const links = [
  { href: "/admin", label: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/projects", label: "projects", icon: FolderGit2 },
  { href: "/admin/skills", label: "skills", icon: Sparkles },
  { href: "/admin/passions", label: "passions", icon: Heart },
  { href: "/admin/profile", label: "profile", icon: UserCircle2 },
  { href: "/admin/account", label: "account", icon: KeyRound },
];

export function AdminShell({ children, username }: { children: React.ReactNode; username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Déconnecté");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Erreur");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container-x flex flex-col gap-8 py-8 lg:flex-row">
        <aside className="lg:w-64 lg:flex-shrink-0">
          <div className="card sticky top-8 p-4">
            <Link href="/" className="mb-5 flex items-center gap-2 px-2">
              <span className="grid h-9 w-9 place-items-center rounded-md border border-bg-ring bg-bg-soft font-mono text-accent">
                {`{}`}
              </span>
              <div>
                <p className="font-mono text-sm font-semibold text-white">{username}</p>
                <p className="font-mono text-xs text-term-comment">// admin</p>
              </div>
            </Link>
            <nav className="flex flex-col gap-1">
              {links.map((l) => {
                const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 font-mono text-sm transition ${
                      active
                        ? "bg-accent/10 text-accent ring-1 ring-accent/30"
                        : "text-zinc-400 hover:bg-bg-card hover:text-white"
                    }`}
                  >
                    <Icon size={14} />
                    <span><span className="text-term-comment">./</span>{l.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 space-y-1 border-t border-bg-ring pt-4">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-md px-3 py-2 font-mono text-sm text-zinc-400 transition hover:bg-bg-card hover:text-white"
              >
                <Eye size={14} /> live_preview
              </a>
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 font-mono text-sm text-zinc-400 transition hover:bg-bg-card hover:text-red-300"
              >
                <LogOut size={14} /> logout
              </button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
