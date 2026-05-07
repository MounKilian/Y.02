import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import type { PortfolioData, PublicData } from "./types";

const DATA_FILE = path.join(process.cwd(), "data", "portfolio.json");

let writeQueue: Promise<void> = Promise.resolve();

async function readRaw(): Promise<PortfolioData> {
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw) as PortfolioData;
}

async function writeRaw(data: PortfolioData): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(DATA_FILE, json, "utf-8");
}

export async function readData(): Promise<PortfolioData> {
  const data = await readRaw();
  let dirty = false;
  if (!data.auth.passwordHash) {
    const pw = data.auth.defaultPassword || "admin123";
    data.auth.passwordHash = await bcrypt.hash(pw, 10);
    delete data.auth.defaultPassword;
    dirty = true;
  }
  if (!data.passions) {
    data.passions = { intro: "", gaming: [], music: [] };
    dirty = true;
  }
  for (const p of data.projects) {
    if (typeof p.playUrl !== "string") {
      p.playUrl = "";
      dirty = true;
    }
  }
  for (const g of data.passions.gaming) {
    if (typeof g.image !== "string") {
      g.image = "";
      dirty = true;
    }
  }
  if (dirty) await writeRaw(data);
  return data;
}

export async function writeData(updater: (data: PortfolioData) => PortfolioData | Promise<PortfolioData>): Promise<PortfolioData> {
  const run = async () => {
    const current = await readData();
    const next = await updater(structuredClone(current));
    await writeRaw(next);
    return next;
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

export async function getPublicData(): Promise<PublicData> {
  const d = await readData();
  return {
    profile: d.profile,
    projects: [...d.projects].sort((a, b) => a.order - b.order),
    skills: d.skills,
    passions: d.passions,
  };
}

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
