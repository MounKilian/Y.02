"use client";
import { Mail, MapPin } from "lucide-react";
import type { Profile } from "@/lib/types";
import { SocialIcon } from "./Icon";

export function Contact({ profile }: { profile: Profile }) {
  const socials = profile.socials.filter((s) => s.url);
  return (
    <div className="card relative overflow-hidden">
      <div className="flex items-center gap-2 border-b border-bg-ring bg-bg-soft/60 px-4 py-2.5 font-mono text-xs">
        <span className="h-2.5 w-2.5 rounded-full bg-term-pink/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-term-orange/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-term-green/80" />
        <span className="ml-2 text-term-comment">contact.sh</span>
      </div>
      <div className="space-y-5 p-8 sm:p-10 font-mono text-sm">
        <div>
          <p className="text-term-comment">#!/bin/bash</p>
          <p className="text-term-comment"># reach me — fast and friendly</p>
        </div>
        <div className="space-y-1.5">
          <p>
            <span className="text-term-purple">echo </span>
            <span className="text-accent">"Une idée de projet, un stage, ou simplement envie d'échanger ?"</span>
          </p>
          <p>
            <span className="text-term-purple">echo </span>
            <span className="text-accent">"Je réponds vite."</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          {profile.email ? (
            <a
              href={`mailto:${profile.email}`}
              className="card flex items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5 hover:border-accent/50"
            >
              <div>
                <p className="text-xs text-term-comment">// email</p>
                <p className="text-zinc-200">{profile.email}</p>
              </div>
              <Mail size={18} className="text-accent" />
            </a>
          ) : (
            <div className="card flex items-center justify-between gap-3 p-4 opacity-60">
              <div>
                <p className="text-xs text-term-comment">// email</p>
                <p className="text-zinc-400">à venir</p>
              </div>
              <Mail size={18} className="text-term-comment" />
            </div>
          )}
          {profile.location ? (
            <div className="card flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-xs text-term-comment">// location</p>
                <p className="text-zinc-200">{profile.location}</p>
              </div>
              <MapPin size={18} className="text-accent" />
            </div>
          ) : null}
        </div>

        {socials.length > 0 ? (
          <div className="border-t border-bg-ring/60 pt-5">
            <p className="text-xs text-term-comment">// elsewhere</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  <SocialIcon name={s.icon} size={14} />
                  {s.label.toLowerCase()}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
