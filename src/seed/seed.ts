import mongoose from 'mongoose';
import config from '@/config/config';
import logger from '@/utils/logger';
import User from '@/models/user.model';
import Category from '@/models/category.model';
import MenuItem from '@/models/menuItem.model';
import Inventory from '@/models/inventory.model';

async function seed() {
  logger.info('Starting seed...');
  await mongoose.connect(config.mongoUri);

  // Admin user
  const adminEmail = 'admin@canteen.local';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({ name: 'Admin', email: adminEmail, password: 'admin123', role: 'admin' });
    logger.info('Created admin user with email admin@canteen.local and password admin123');
  } else {
    logger.info('Admin user already exists');
  }

  // Categories
  const categoryNames = ['Beverages', 'Snacks', 'Meals'];
  const categories = [] as Array<{ name: string; _id: mongoose.Types.ObjectId }>;
  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    let cat = await Category.findOne({ name });
    if (!cat) {
      cat = await Category.create({ name, sortOrder: i + 1 });
      logger.info(`Created category ${name}`);
    }
    categories.push({ name: cat.name, _id: cat._id });
  }

  // Menu Items
  const menuSeed = [
    { name: 'Masala Chai', price: 20, description: 'Hot spiced tea', category: 'Beverages' },
    { name: 'Coffee', price: 30, description: 'Fresh brewed', category: 'Beverages' },
    { name: 'Samosa', price: 15, description: 'Crispy and tasty', category: 'Snacks' },
    { name: 'Veg Thali', price: 120, description: 'Complete meal', category: 'Meals' },
  ];

  for (const item of menuSeed) {
    const cat = categories.find((c) => c.name === item.category)!;
    let m = await MenuItem.findOne({ name: item.name });
    if (!m) {
      m = await MenuItem.create({
        name: item.name,
        price: item.price,
        description: item.description,
        category: cat._id,
        isAvailable: true,
      });
      logger.info(`Created menu item ${item.name}`);
    }
    // Ensure inventory exists with quantity
    let inv = await Inventory.findOne({ menuItem: m._id });
    if (!inv) {
      inv = await Inventory.create({ menuItem: m._id, quantity: 20, lowStockThreshold: 5, unit: 'pcs' });
      logger.info(`Created inventory for ${item.name}`);
    }
  }

  await mongoose.disconnect();
  logger.info('Seed completed.');
}

seed().catch((err) => {
  logger.error(`Seed error: ${err.message}`);
  process.exit(1);
});
