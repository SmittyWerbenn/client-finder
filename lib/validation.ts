import { z } from 'zod';
import { LEAD_STATUSES_DB, ROLES } from './db/schema';

const email = z.string().trim().toLowerCase().email('Format email tidak valid.').max(160);
const password = z.string().min(10, 'Password minimal 10 karakter.').max(200, 'Password maksimal 200 karakter.');
const shortText = (label: string, min: number, max: number) =>
  z.string().trim().min(min, `${label} minimal ${min} karakter.`).max(max, `${label} maksimal ${max} karakter.`);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password wajib diisi.').max(200),
});

export const searchSchema = z
  .object({
    mode: z.enum(['category', 'name']).default('category'),
    categoryId: z.string().trim().max(80).optional(),
    name: z.string().trim().max(80).optional(),
    city: shortText('Kota', 2, 80),
    websiteFilter: z.enum(['all', 'no_website', 'has_website']).default('all'),
    refresh: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'category' && !value.categoryId) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Pilih kategori usaha.' });
    }
    if (value.mode === 'name' && (value.name?.length ?? 0) < 2) {
      ctx.addIssue({ code: 'custom', path: ['name'], message: 'Nama usaha minimal 2 karakter.' });
    }
  });

export const categoryInputSchema = z.object({
  sector: shortText('Sektor', 2, 80),
  subCategory: shortText('Sub-kategori', 2, 80),
  keyword: shortText('Keyword', 2, 120),
  pitch: shortText('Pitch angle', 10, 700),
  ownerId: z.string().trim().min(1).nullable().optional(),
});

export const leadStatusSchema = z.enum(LEAD_STATUSES_DB);

export const leadCreateSchema = z.object({
  name: shortText('Nama bisnis', 2, 160),
  city: shortText('Kota', 2, 80),
  address: z.string().trim().max(300).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  website: z.string().trim().max(300).optional().default(''),
  sector: z.string().trim().max(80).optional().default('Manual'),
  subCategory: z.string().trim().max(80).optional().default('Input manual'),
  pitch: z.string().trim().max(700).optional().default(''),
  mapsUrl: z.string().trim().max(500).optional().default(''),
  status: leadStatusSchema.optional().default('New'),
  ownerId: z.string().trim().min(1).optional(),
});

export const leadUpdateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().max(300).optional(),
  sector: z.string().trim().max(80).optional(),
  subCategory: z.string().trim().max(80).optional(),
  pitch: z.string().trim().max(700).optional(),
  mapsUrl: z.string().trim().max(500).optional(),
  status: leadStatusSchema.optional(),
});

export const userCreateSchema = z.object({
  email,
  name: shortText('Nama', 2, 80),
  password,
  role: z.enum(ROLES).default('USER'),
});

export const userUpdateSchema = z.object({
  name: shortText('Nama', 2, 80).optional(),
  email: email.optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({ password });

export type LoginInput = z.infer<typeof loginSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
