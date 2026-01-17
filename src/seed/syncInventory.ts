import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import MenuItem from '../models/menuItem.model';
import Inventory from '../models/inventory.model';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Simple logger
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`)
};

async function syncInventory() {
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    logger.error('MONGO_URI is not set in environment variables');
    process.exit(1);
  }
  
  logger.info('Starting inventory sync...');
  logger.info(`Connecting to MongoDB...`);
  
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('✅ Successfully connected to MongoDB');

    // Get all menu items
    const menuItems = await MenuItem.find({});
    logger.info(`Found ${menuItems.length} menu items`);

    let createdCount = 0;
    let existingCount = 0;

    for (const menuItem of menuItems) {
      // Check if inventory exists
      let inventory = await Inventory.findOne({ menuItem: menuItem._id });
      
      if (!inventory) {
        // Create inventory with default values
        inventory = await Inventory.create({
          menuItem: menuItem._id,
          quantity: 50, // Default quantity
          lowStockThreshold: 10,
          unit: 'pcs'
        });
        logger.info(`✅ Created inventory for: ${menuItem.name} (ID: ${menuItem._id})`);
        createdCount++;
      } else {
        logger.info(`ℹ️  Inventory already exists for: ${menuItem.name} (Quantity: ${inventory.quantity})`);
        existingCount++;
      }
    }

    logger.info(`\n📊 Summary:`);
    logger.info(`   - Created: ${createdCount} inventory records`);
    logger.info(`   - Existing: ${existingCount} inventory records`);
    logger.info(`   - Total: ${menuItems.length} menu items`);
    logger.info('\n✅ Inventory sync completed successfully');
    
  } catch (error: any) {
    logger.error(`❌ Error syncing inventory: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
}

syncInventory();
