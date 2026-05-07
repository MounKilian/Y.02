"use client";
import { motion } from "framer-motion";
import type { Skill } from "@/lib/types";

const ORDER: Skill["category"][] = ["Frontend", "Backend", "DevOps", "Tools", "Other"];
const CAT_COLORS: Record<Skill["category"], string> = {
  Frontend: "text-term-blue",
  Backend: "text-term-green",
  DevOps: "text-term-orange",
  Tools: "text-term-purple",
  Other: "text-zinc-300",
};

export function Skills({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) {
    return (
      <div className="card p-8 text-center font-mono text-sm text-term-comment">
        // Aucune compétence renseignée.
      </div>
    );
  }
  const grouped = ORDER.map((cat) => ({
    cat,
    items: skills.filter((s) => s.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {grouped.map((g, i) => (
        <motion.div
          key={g.cat}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          className="card overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-bg-ring bg-bg-soft/60 px-4 py-2 font-mono text-xs">
            <span className="text-term-comment">module</span>
            <span className={CAT_COLORS[g.cat]}>{g.cat.toLowerCase()}</span>
            <span className="ml-auto text-term-comment">{g.items.length}</span>
          </div>
          <ul className="divide-y divide-bg-ring/60">
            {g.items.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="font-mono text-sm text-zinc-200">
                  <span className="text-term-comment">{">"} </span>
                  {s.name}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex h-1 w-20 overflow-hidden rounded-full bg-bg-ring">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-glow"
                      style={{ width: `${(s.level / 5) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-xs text-term-comment">{s.level}/5</span>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}
