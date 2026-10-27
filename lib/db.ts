import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DEFAULT_CATEGORIES } from './seed';
import type { Category, CategoryInput } from './types';

/**
 * Storage lokal zero-setup: satu file JSON di root project (default ./data/db.json).
 * - Tidak butuh server DB eksternal.
 * - Tulisan diserialisasi lewat queue agar tidak korup saat request paralel.
 */

// Path di-scope statis ke subfolder `data/` supaya Turbopack tidak men-trace
// seluruh project. Ganti nama file saja lewat DB_FILE_NAME bila perlu.
const DB_FILE = path.join(process.cwd(), 'data', process.env.DB_FILE_NAME || 'db.json');

type DbShape = {
  version: number;
  categories: Category[];
};

const EMPTY_DB: DbShape = { version: 1, categories: [] };

function nowIso() {
  return new Date().toISOString();
}

function makeCategory(input: SeedLike, isDefault = true): Category {
  const ts = nowIso();
  return {
    id: input.id,
    sector: input.sector.trim(),
    subCategory: input.subCategory.trim(),
    keyword: input.keyword.trim(),
    pitch: input.pitch.trim(),
    isDefault,
    createdAt: ts,
    updatedAt: ts,
  };
}

type SeedLike = { id: string; sector: string; subCategory: string; keyword: string; pitch: string };

function seedCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((c) => makeCategory(c, true));
}

async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    const db: DbShape = {
      version: parsed.version ?? 1,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    };
    if (db.categories.length === 0) {
      db.categories = seedCategories();
      await writeDb(db);
    }
    return db;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      const db: DbShape = { ...EMPTY_DB, categories: seedCategories() };
      await writeDb(db);
      return db;
    }
    // File korup → backup lalu reset ke seeder, jangan sampai app mati.
    const backup = `${DB_FILE}.corrupt-${Date.now()}`;
    await fs.rename(DB_FILE, backup).catch(() => {});
    const db: DbShape = { ...EMPTY_DB, categories: seedCategories() };
    await writeDb(db);
    return db;
  }
}

async function writeDb(db: DbShape): Promise<void> {
  const dir = path.dirname(DB_FILE);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tmp, DB_FILE);
}

// Queue global (bertahan antar hot-reload di dev).
const globalRef = globalThis as unknown as { __clientFinderDbQueue?: Promise<unknown> };
if (!globalRef.__clientFinderDbQueue) globalRef.__clientFinderDbQueue = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = globalRef.__clientFinderDbQueue as Promise<unknown>;
  const next = prev.then(fn, fn);
  globalRef.__clientFinderDbQueue = next.catch(() => {});
  return next;
}

/* ───────────────────────── Categories ───────────────────────── */

export async function listCategories(): Promise<Category[]> {
  const db = await readDb();
  return [...db.categories].sort((a, b) => {
    if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
    return a.subCategory.localeCompare(b.subCategory);
  });
}

export async function getCategory(id: string): Promise<Category | null> {
  const db = await readDb();
  return db.categories.find((c) => c.id === id) ?? null;
}

function validateInput(input: unknown): CategoryInput {
  const body = (input ?? {}) as Record<string, unknown>;
  const sector = String(body.sector ?? '').trim();
  const subCategory = String(body.subCategory ?? '').trim();
  const keyword = String(body.keyword ?? '').trim();
  const pitch = String(body.pitch ?? '').trim();

  if (sector.length < 2) throw new ValidationError('Nama sektor wajib diisi (min. 2 karakter).');
  if (subCategory.length < 2) throw new ValidationError('Sub-kategori wajib diisi (min. 2 karakter).');
  if (keyword.length < 2) throw new ValidationError('Keyword pencarian wajib diisi (min. 2 karakter).');
  if (pitch.length < 10) throw new ValidationError('Pitch angle wajib diisi (min. 10 karakter).');
  if (sector.length > 80 || subCategory.length > 80 || keyword.length > 120) {
    throw new ValidationError('Panjang teks melebihi batas (sektor/sub-kategori 80, keyword 120).');
  }
  if (pitch.length > 700) throw new ValidationError('Pitch angle maksimal 700 karakter.');

  return { sector, subCategory, keyword, pitch };
}

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

export async function createCategory(input: unknown): Promise<Category> {
  const data = validateInput(input);
  return withLock(async () => {
    const db = await readDb();
    const duplicate = db.categories.some(
      (c) =>
        c.subCategory.toLowerCase() === data.subCategory.toLowerCase() &&
        c.sector.toLowerCase() === data.sector.toLowerCase(),
    );
    if (duplicate) throw new ValidationError('Sub-kategori pada sektor tersebut sudah ada.');

    const item = makeCategory({ id: randomUUID(), ...data }, false);
    db.categories.push(item);
    await writeDb(db);
    return item;
  });
}

export async function updateCategory(id: string, input: unknown): Promise<Category> {
  const data = validateInput(input);
  return withLock(async () => {
    const db = await readDb();
    const idx = db.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new NotFoundError('Kategori tidak ditemukan.');

    const duplicate = db.categories.some(
      (c) =>
        c.id !== id &&
        c.subCategory.toLowerCase() === data.subCategory.toLowerCase() &&
        c.sector.toLowerCase() === data.sector.toLowerCase(),
    );
    if (duplicate) throw new ValidationError('Sub-kategori pada sektor tersebut sudah ada.');

    const updated: Category = {
      ...db.categories[idx],
      ...data,
      updatedAt: nowIso(),
    };
    db.categories[idx] = updated;
    await writeDb(db);
    return updated;
  });
}

export async function deleteCategory(id: string): Promise<void> {
  return withLock(async () => {
    const db = await readDb();
    const idx = db.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new NotFoundError('Kategori tidak ditemukan.');
    db.categories.splice(idx, 1);
    await writeDb(db);
  });
}

export async function resetCategoriesToDefault(): Promise<Category[]> {
  return withLock(async () => {
    const db = await readDb();
    const custom = db.categories.filter((c) => !c.isDefault);
    db.categories = [...seedCategories(), ...custom];
    await writeDb(db);
    return db.categories;
  });
}
