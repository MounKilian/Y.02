export type Social = {
  id: string;
  label: string;
  url: string;
  icon: string;
};

export type Profile = {
  name: string;
  title: string;
  subtitle: string;
  bio: string;
  email: string;
  location: string;
  avatar: string;
  socials: Social[];
};

export type Project = {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  githubUrl: string;
  demoUrl: string;
  playUrl: string;
  image: string;
  order: number;
};

export type SkillCategory = "Frontend" | "Backend" | "DevOps" | "Tools" | "Other";

export type Skill = {
  id: string;
  name: string;
  category: SkillCategory;
  level: number;
};

export type GamingItem = {
  id: string;
  game: string;
  platform: string;
  username: string;
  url: string;
  rank: string;
  accent: string;
  image: string;
};

export type MusicItem = {
  id: string;
  type: "album" | "playlist" | "artist" | "track";
  title: string;
  artist: string;
  url: string;
  coverUrl: string;
  note: string;
};

export type Passions = {
  intro: string;
  gaming: GamingItem[];
  music: MusicItem[];
};

export type Auth = {
  username: string;
  passwordHash: string;
  defaultPassword?: string;
};

export type PortfolioData = {
  profile: Profile;
  projects: Project[];
  skills: Skill[];
  passions: Passions;
  auth: Auth;
};

export type PublicData = {
  profile: Profile;
  projects: Project[];
  skills: Skill[];
  passions: Passions;
};
