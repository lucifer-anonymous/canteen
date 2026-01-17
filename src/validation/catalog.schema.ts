import { z } from 'zod';

export const menuQuery = z.object({
  q: z.string().optional(),
  category: z.string().optional(), // id or slug
  available: z
    .string()
    .optional()
    .transform((v: string | undefined) => (v ? v.toLowerCase() : undefined)),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  sortBy: z.enum(['name', 'price', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
