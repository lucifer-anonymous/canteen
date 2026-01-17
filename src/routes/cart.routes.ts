import { Router, Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { requireAuth } from '@/middlewares/auth';
import Cart from '@/models/cart.model';
import MenuItem from '@/models/menuItem.model';
import { validate } from '@/middlewares/validate';
import { addCartItemBody, updateCartItemBody } from '@/validation/cart.schema';

const router = Router();

router.use(requireAuth);

async function ensureCart(userId: string) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

router.get('/cart', async (req: Request, res: Response) => {
  const user = (req as any).user as { sub: string };
  const cart = await ensureCart(user.sub);
  return res.status(200).json({ success: true, data: cart });
});

router.post('/cart/items', validate({ body: addCartItemBody }), async (req: Request, res: Response) => {
  const user = (req as any).user as { sub: string };
  const { menuItemId, qty } = req.body || {};
  if (!menuItemId || !isValidObjectId(menuItemId)) return res.status(400).json({ success: false, message: 'Invalid menuItemId' });
  const count = Math.max(1, parseInt(String(qty || 1), 10));

  const menu = await MenuItem.findById(menuItemId);
  if (!menu) return res.status(404).json({ success: false, message: 'Menu item not found' });

  const cart = await ensureCart(user.sub);
  const idx = cart.items.findIndex((i) => String(i.menuItem) === String(menu._id));
  if (idx >= 0) {
    cart.items[idx].qty += count;
  } else {
    cart.items.push({ menuItem: menu._id, name: menu.name, price: menu.price, qty: count });
  }
  await cart.save();
  return res.status(200).json({ success: true, data: cart });
});

router.patch('/cart/items/:menuItemId', validate({ body: updateCartItemBody }), async (req: Request, res: Response) => {
  const user = (req as any).user as { sub: string };
  const { menuItemId } = req.params;
  if (!isValidObjectId(menuItemId)) return res.status(400).json({ success: false, message: 'Invalid menuItemId' });
  const count = parseInt(String((req.body || {}).qty), 10);
  if (isNaN(count)) return res.status(400).json({ success: false, message: 'qty is required' });

  const cart = await ensureCart(user.sub);
  const idx = cart.items.findIndex((i) => String(i.menuItem) === String(menuItemId));
  if (idx < 0) return res.status(404).json({ success: false, message: 'Item not in cart' });

  if (count <= 0) {
    cart.items.splice(idx, 1);
  } else {
    cart.items[idx].qty = count;
  }
  await cart.save();
  return res.status(200).json({ success: true, data: cart });
});

router.delete('/cart/items/:menuItemId', async (req: Request, res: Response) => {
  const user = (req as any).user as { sub: string };
  const { menuItemId } = req.params;
  if (!isValidObjectId(menuItemId)) return res.status(400).json({ success: false, message: 'Invalid menuItemId' });
  const cart = await ensureCart(user.sub);
  const idx = cart.items.findIndex((i) => String(i.menuItem) === String(menuItemId));
  if (idx < 0) return res.status(404).json({ success: false, message: 'Item not in cart' });
  cart.items.splice(idx, 1);
  await cart.save();
  return res.status(200).json({ success: true, data: cart });
});

router.delete('/cart', async (req: Request, res: Response) => {
  const user = (req as any).user as { sub: string };
  const cart = await ensureCart(user.sub);
  cart.items = [];
  await cart.save();
  return res.status(200).json({ success: true, data: cart });
});

export default router;
