import { Router, Request, Response } from 'express';
import mongoose, { isValidObjectId } from 'mongoose';
import { requireAuth } from '@/middlewares/auth';
import Cart from '@/models/cart.model';
import Order, { OrderStatus } from '@/models/order.model';
import Inventory from '@/models/inventory.model';
import MenuItem from '@/models/menuItem.model';

const router = Router();

router.use(requireAuth);

// Place order from current cart
router.post('/orders', async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = (req as any).user as { sub: string };
    const { notes, items: cartItems } = (req.body || {}) as { notes?: string; items?: any[] };

    // Accept cart items from request body (for frontend local cart)
    // or fall back to database cart
    let cart;
    let items;
    
    if (cartItems && cartItems.length > 0) {
      // Using cart items from request
      items = cartItems.map((item: any) => ({
        menuItem: item._id || item.id || item.menuItem,
        name: item.name,
        price: item.price,
        qty: item.quantity || item.qty || 1,
      }));
    } else {
      // Fall back to database cart
      cart = await Cart.findOne({ user: user.sub }).session(session);
      if (!cart || cart.items.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Cart is empty' });
      }
      items = cart.items.map((i) => ({
        menuItem: i.menuItem,
        name: i.name,
        price: i.price,
        qty: i.qty,
      }));
    }
    
    if (!items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Build requirement map
    const reqMap = new Map<string, number>();
    for (const it of items) {
      const key = String(it.menuItem);
      reqMap.set(key, (reqMap.get(key) || 0) + it.qty);
    }
    const ids = Array.from(reqMap.keys());

    // Load inventories
    const inventories = await Inventory.find({ menuItem: { $in: ids } }).session(session);
    const invMap = new Map(inventories.map((i) => [String(i.menuItem), i]));

    // Validate availability
    for (const [menuItemId, need] of reqMap.entries()) {
      const inv = invMap.get(menuItemId);
      if (!inv) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Insufficient stock for one or more items' });
      }
      if (inv.quantity < need) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ success: false, message: `Insufficient stock for item ${menuItemId}` });
      }
    }

    // Decrement stock
    for (const [menuItemId, need] of reqMap.entries()) {
      const inv = invMap.get(menuItemId)!;
      inv.quantity -= need;
      await inv.save({ session });
      // Toggle availability if needed
      if (inv.quantity <= 0) {
        await MenuItem.findByIdAndUpdate(menuItemId, { isAvailable: false }, { session });
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const total = subtotal; // Add tax/fees here if needed

    const order = await Order.create(
      [
        {
          user: user.sub,
          items,
          subtotal,
          total,
          notes,
          status: 'placed' as OrderStatus,
        },
      ],
      { session }
    );

    // Clear database cart if it exists
    if (cart) {
      cart.items = [];
      await cart.save({ session });
    }

    await session.commitTransaction();
    return res.status(201).json({ success: true, data: order[0] });
  } catch (err) {
    await session.abortTransaction();
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  } finally {
    await session.endSession();
  }
});

// List my orders
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as { sub: string };
    const { status, page = '1', limit = '10' } = req.query as Record<string, string>;

    const filters: any = { user: user.sub };
    if (status) filters.status = status;

    const numericPage = Math.max(parseInt(String(page), 10) || 1, 1);
    const numericLimit = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 100);

    const total = await Order.countDocuments(filters);
    const orders = await Order.find(filters)
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit);

    return res.status(200).json({ success: true, data: orders, page: numericPage, limit: numericLimit, total });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Get my order by id
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as { sub: string };
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (String(order.user) !== String(user.sub)) return res.status(403).json({ success: false, message: 'Forbidden' });

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Cancel my order (within 90 seconds)
router.patch('/orders/:id/cancel', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as { sub: string };
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (String(order.user) !== String(user.sub)) return res.status(403).json({ success: false, message: 'Forbidden' });

    // Check if order can be cancelled
    if (order.status !== 'placed') {
      return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
    }

    // Check 90-second window
    const elapsed = Date.now() - order.createdAt.getTime();
    const CANCELLATION_WINDOW = 90 * 1000; // 90 seconds
    if (elapsed > CANCELLATION_WINDOW) {
      return res.status(400).json({ success: false, message: 'Cancellation window expired' });
    }

    // Cancel the order
    order.status = 'cancelled';
    await order.save();

    return res.status(200).json({ success: true, data: order, message: 'Order cancelled successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

export default router;
