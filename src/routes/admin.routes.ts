import { Router, Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { requireAuth, requireRole } from '@/middlewares/auth';
import Category from '@/models/category.model';
import MenuItem from '@/models/menuItem.model';
import Order, { OrderStatus } from '@/models/order.model';
import Inventory from '@/models/inventory.model';
import { validate } from '@/middlewares/validate';
import {
  createCategoryBody,
  updateCategoryBody,
  createMenuItemBody,
  updateMenuItemBody,
  createInventoryBody,
  updateInventoryBody,
} from '@/validation/admin.schema';

const router = Router();

// All admin routes require auth + role (admin or staff)
router.use(requireAuth, requireRole('admin', 'staff'));

// ========== Categories ==========
router.post('/categories', validate({ body: createCategoryBody }), async (req: Request, res: Response) => {
  try {
    const { name, sortOrder } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const exists = await Category.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ success: false, message: 'Category already exists' });

    const cat = await Category.create({ name: name.trim(), sortOrder });
    return res.status(201).json({ success: true, data: cat });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ========== Inventory (Admin) ==========
// List inventory with optional lowStockOnly filter and pagination
router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const { lowStockOnly, page = '1', limit = '50' } = req.query as Record<string, string>;
    const filters: any = {};
    if (String(lowStockOnly).toLowerCase() === 'true') {
      filters.$expr = { $lte: ['$quantity', { $ifNull: ['$lowStockThreshold', 0] }] };
    }

    const numericPage = Math.max(parseInt(String(page), 10) || 1, 1);
    const numericLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);

    const total = await Inventory.countDocuments(filters);
    const items = await Inventory.find(filters)
      .populate('menuItem', 'name price isAvailable')
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit);

    return res.status(200).json({ success: true, data: items, page: numericPage, limit: numericLimit, total });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Get inventory by menuItemId
router.get('/inventory/:menuItemId', async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    if (!isValidObjectId(menuItemId)) return res.status(400).json({ success: false, message: 'Invalid menuItemId' });
    const inv = await Inventory.findOne({ menuItem: menuItemId }).populate('menuItem', 'name price isAvailable');
    if (!inv) return res.status(404).json({ success: false, message: 'Inventory not found' });
    return res.status(200).json({ success: true, data: inv });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Create inventory record for a menu item
router.post('/inventory', validate({ body: createInventoryBody }), async (req: Request, res: Response) => {
  try {
    const { menuItemId, quantity = 0, lowStockThreshold = 0, unit } = req.body || {};
    if (!menuItemId || !isValidObjectId(menuItemId)) {
      return res.status(400).json({ success: false, message: 'menuItemId is required' });
    }
    const menu = await MenuItem.findById(menuItemId);
    if (!menu) return res.status(400).json({ success: false, message: 'Menu item not found' });

    const exists = await Inventory.findOne({ menuItem: menuItemId });
    if (exists) return res.status(409).json({ success: false, message: 'Inventory already exists for this item' });

    const inv = await Inventory.create({ menuItem: menuItemId, quantity: Math.max(0, Number(quantity)), lowStockThreshold: Math.max(0, Number(lowStockThreshold)), unit });

    // Update availability based on quantity
    await MenuItem.findByIdAndUpdate(menuItemId, { isAvailable: inv.quantity > 0 });

    return res.status(201).json({ success: true, data: inv });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Update inventory: supports absolute set via quantity or relative via adjust
router.patch('/inventory/:menuItemId', validate({ body: updateInventoryBody }), async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    if (!isValidObjectId(menuItemId)) return res.status(400).json({ success: false, message: 'Invalid menuItemId' });

    const { quantity, adjust, lowStockThreshold, unit } = req.body || {};
    let inv = await Inventory.findOne({ menuItem: menuItemId });
    if (!inv) {
      // auto create if missing and quantity provided
      if (typeof quantity === 'undefined' && typeof adjust === 'undefined') {
        return res.status(404).json({ success: false, message: 'Inventory not found' });
      }
      inv = await Inventory.create({ menuItem: menuItemId, quantity: 0 });
    }

    if (typeof adjust !== 'undefined') {
      inv.quantity = Math.max(0, inv.quantity + Number(adjust));
    }
    if (typeof quantity !== 'undefined') {
      inv.quantity = Math.max(0, Number(quantity));
    }
    if (typeof lowStockThreshold !== 'undefined') {
      inv.lowStockThreshold = Math.max(0, Number(lowStockThreshold));
    }
    if (typeof unit !== 'undefined') {
      inv.unit = unit;
    }

    await inv.save();
    // Reflect availability based on quantity
    await MenuItem.findByIdAndUpdate(menuItemId, { isAvailable: inv.quantity > 0 });

    return res.status(200).json({ success: true, data: inv });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});
router.patch('/categories/:id', validate({ body: updateCategoryBody }), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const { name, sortOrder } = req.body || {};
    const updates: any = {};
    if (name) updates.name = String(name).trim();
    if (typeof sortOrder !== 'undefined') updates.sortOrder = sortOrder;

    const cat = await Category.findById(id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

    if (typeof updates.name !== 'undefined') cat.name = updates.name;
    if (typeof updates.sortOrder !== 'undefined') cat.sortOrder = updates.sortOrder;

    await cat.save();
    return res.status(200).json({ success: true, data: cat });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const inUse = await MenuItem.exists({ category: id });
    if (inUse) return res.status(409).json({ success: false, message: 'Category in use by menu items' });

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Category not found' });

    return res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ========== Menu Items ==========
router.post('/menu', validate({ body: createMenuItemBody }), async (req: Request, res: Response) => {
  try {
    const { name, description, price, imageUrl, category, isAvailable, tags } = req.body || {};
    if (!name || typeof price === 'undefined' || !category) {
      return res.status(400).json({ success: false, message: 'name, price and category are required' });
    }
    if (!isValidObjectId(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category id' });
    }
    const cat = await Category.findById(category);
    if (!cat) return res.status(400).json({ success: false, message: 'Category not found' });

    const item = await MenuItem.create({
      name: String(name).trim(),
      description,
      price: Number(price),
      imageUrl,
      category,
      isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true,
      tags,
    });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

router.patch('/menu/:id', validate({ body: updateMenuItemBody }), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const updates: any = {};
    const allowed = ['name', 'description', 'price', 'imageUrl', 'category', 'isAvailable', 'tags'];
    for (const key of allowed) {
      if (key in (req.body || {})) updates[key] = (req.body as any)[key];
    }

    if (typeof updates.name !== 'undefined') updates.name = String(updates.name).trim();
    if (typeof updates.price !== 'undefined') updates.price = Number(updates.price);

    if (typeof updates.category !== 'undefined') {
      if (!isValidObjectId(updates.category)) {
        return res.status(400).json({ success: false, message: 'Invalid category id' });
      }
      const exists = await Category.findById(updates.category);
      if (!exists) return res.status(400).json({ success: false, message: 'Category not found' });
    }

    const item = await MenuItem.findByIdAndUpdate(id, updates, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

router.delete('/menu/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const deleted = await MenuItem.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Menu item not found' });

    return res.status(200).json({ success: true, message: 'Menu item deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// ========== Orders (Admin) ==========
// List orders with optional status filter and pagination
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const filters: any = {};
    if (status) filters.status = status;

    const numericPage = Math.max(parseInt(String(page), 10) || 1, 1);
    const numericLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);

    const total = await Order.countDocuments(filters);
    const orders = await Order.find(filters)
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit);

    return res
      .status(200)
      .json({ success: true, data: orders, page: numericPage, limit: numericLimit, total });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Get single order
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || id.length < 8) return res.status(400).json({ success: false, message: 'Invalid id' });
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Update order status
router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!id || id.length < 8) return res.status(400).json({ success: false, message: 'Invalid id' });
    const allowed: OrderStatus[] = ['placed', 'preparing', 'ready', 'served', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of ${allowed.join(', ')}` });
    }
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.status = status;
    await order.save();
    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

export default router;
