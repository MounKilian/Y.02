"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const ROUTES = [
  { href: "/", label: "home", file: "index.tsx" },
  { href: "/projects", label: "projects", file: "projects.tsx" },
  { href: "/skills", label: "skills", file: "skills.tsx" },
  { href: "/passions", label: "passions", file: "passions.tsx" },
  { href: "/contact", label: "contact", file: "contact.tsx" },
];

export function Navbar({ name }: { name: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 transition-all ${
        scrolled
          ? "border-b border-bg-ring/80 bg-bg/80 backdrop-blur-lg"
          : "border-b border-transparent"
      }`}
    >
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="group flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="text-term-comment">$</span>
          <span className="text-white">{name.toLowerCase()}</span>
          <span className="text-term-comment">@</span>
          <span className="text-accent">portfolio</span>
          <span className="text-term-comment group-hover:text-white transition">~</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {ROUTES.map((r) => {
            const active = r.href === "/" ? pathname === "/" : pathname.startsWith(r.href);
            return (
              <Link
                key={r.href}
                href={r.href}
                className={`group relative rounded-md px-3 py-1.5 font-mono text-sm transition ${
                  active ? "text-accent" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className={active ? "text-term-comment" : "text-term-comment/70"}>./</span>
                {r.label}
                {active ? (
                  <span className="absolute -bottom-px left-2 right-2 h-px bg-accent" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/contact" className="btn-primary">
            <span className="text-bg/70">{">"}</span> hire_me
          </Link>
        </div>

        <button
          className="btn-ghost px-2 sm:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-bg-ring bg-bg/95 backdrop-blur-lg sm:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {ROUTES.map((r) => {
              const active = r.href === "/" ? pathname === "/" : pathname.startsWith(r.href);
              return (
                <Link
                  key={r.href}
                  href={r.href}
                  className={`rounded-md px-3 py-2 font-mono text-sm ${
                    active ? "bg-accent/10 text-accent" : "text-zinc-300"
                  }`}
                >
                  <span className="text-term-comment">./</span>
                  {r.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
