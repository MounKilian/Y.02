"use client";
import {
  Github,
  Linkedin,
  Twitter,
  Globe,
  Mail,
  Link2,
  Youtube,
  Instagram,
  Send,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  github: Github,
  linkedin: Linkedin,
  twitter: Twitter,
  x: Twitter,
  globe: Globe,
  portfolio: Globe,
  website: Globe,
  mail: Mail,
  email: Mail,
  link: Link2,
  youtube: Youtube,
  instagram: Instagram,
  telegram: Send,
};

export function SocialIcon({ name, className, size }: { name: string; className?: string; size?: number }) {
  const key = name.toLowerCase();
  const Cmp = map[key] ?? Link2;
  return <Cmp className={className} size={size} />;
}
