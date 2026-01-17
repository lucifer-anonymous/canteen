import { Router, Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import Category from '@/models/category.model';
import MenuItem from '@/models/menuItem.model';
import { validate } from '@/middlewares/validate';
import { menuQuery } from '@/validation/catalog.schema';

const router = Router();

// GET /categories - list all categories (sorted)
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// GET /menu - list menu items with optional filters
// query params:
// q: text search
// category: category id or slug
// available: true/false
// page, limit: pagination
// sortBy: name|price|createdAt, order: asc|desc
router.get('/menu', validate({ query: menuQuery }), async (req: Request, res: Response) => {
  try {
    // Use validated query parameters
    const validatedQuery = (req as any).validatedQuery || {};
    const {
      q,
      category,
      available,
      page = '1',
      limit = '12',
      sortBy = 'name',
      order = 'asc',
    } = validatedQuery;

    const filters: any = {};

    if (typeof available === 'string') {
      if (available.toLowerCase() === 'true') filters.isAvailable = true;
      if (available.toLowerCase() === 'false') filters.isAvailable = false;
    }

    // Category filter: accept id or slug
    if (category) {
      if (isValidObjectId(category)) {
        filters.category = category;
      } else {
        const catDoc = await Category.findOne({ slug: category }).select('_id');
        if (catDoc) filters.category = catDoc._id;
        // if not found, return empty list quickly
        if (!catDoc) {
          return res.status(200).json({ success: true, data: [], page: 1, limit: Number(limit), total: 0 });
        }
      }
    }

    const numericPage = Math.max(parseInt(String(page), 10) || 1, 1);
    const numericLimit = Math.min(Math.max(parseInt(String(limit), 10) || 12, 1), 100);

    const sort: Record<string, 1 | -1> = {};
    const allowedSort = new Set(['name', 'price', 'createdAt']);
    const sortField = allowedSort.has(String(sortBy)) ? String(sortBy) : 'name';
    const sortOrder: 1 | -1 = String(order).toLowerCase() === 'desc' ? -1 : 1;
    sort[sortField] = sortOrder;

    const query = MenuItem.find(filters).sort(sort);

    // Text search
    if (q && q.trim()) {
      // $text if index exists, otherwise fallback to regex OR
      query.find({ $text: { $search: q.trim() } });
    }

    const total = await MenuItem.countDocuments(query.getQuery());

    const items = await query
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .populate('category', 'name slug')
      .lean();

    return res.status(200).json({
      success: true,
      data: items,
      page: numericPage,
      limit: numericLimit,
      total,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

export default router;
