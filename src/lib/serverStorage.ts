// src/lib/serverStorage.ts
// Maneja rutas de archivos de forma diferente en Vercel (solo lectura) vs local
import fs from "fs";
import path from "path";

// En Vercel los archivos persistentes van en /tmp (efímero pero funcional)
// En local van en ./data/
const DATA_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), "data");

export function getDataPath(filename: string): string {
  return path.join(DATA_DIR, filename);
}

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readJSON<T>(filename: string, fallback: T): T {
  ensureDataDir();
  const filepath = getDataPath(filename);
  if (!fs.existsSync(filepath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(filename: string, data: unknown): void {
  ensureDataDir();
  const filepath = getDataPath(filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

export function deleteFile(filename: string): void {
  const filepath = getDataPath(filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
}
