import { z } from 'zod';

export const createCategoryBody = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const updateCategoryBody = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const createMenuItemBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  imageUrl: z.string().url().optional(),
  category: z.string().min(1),
  isAvailable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateMenuItemBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().min(1).optional(),
  isAvailable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export const createInventoryBody = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(0),
  unit: z.string().optional(),
});

export const updateInventoryBody = z.object({
  quantity: z.number().int().nonnegative().optional(),
  adjust: z.number().int().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  unit: z.string().optional(),
});
