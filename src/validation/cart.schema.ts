import { z } from 'zod';

export const addCartItemBody = z.object({
  menuItemId: z.string().min(1),
  qty: z.number().int().min(1).default(1).optional(),
});

export const updateCartItemBody = z.object({
  qty: z.number().int(), // can be <= 0 to trigger removal per route logic
});
