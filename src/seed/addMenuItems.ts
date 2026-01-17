const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Simple logger
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`)
};

// Import models
const Category = require('../models/category.model');
const MenuItem = require('../models/menuItem.model');

async function addMenuItems() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/canteen_test';
  
  logger.info('Starting to add menu items...');
  logger.info(`Connecting to MongoDB at: ${mongoUri.replace(/:[^:]*@/, ':***@')}`);
  
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('Successfully connected to MongoDB');

    // Get all categories
    const categories = await Category.find({});
    if (categories.length === 0) {
      throw new Error('No categories found. Please run the initial seed first.');
    }

    // Map category names to their IDs
    const categoryMap = categories.reduce((acc: any, category: any) => {
      acc[category.name.toLowerCase()] = category._id;
      return acc;
    }, {});

    // Menu items to add
    const newMenuItems = [
      // Beverages
      { 
        name: 'Cold Coffee', 
        description: 'Iced coffee with milk and sugar', 
        price: 50, 
        category: categoryMap['beverages'],
        isAvailable: true,
        tags: ['cold', 'coffee', 'refreshing']
      },
      { 
        name: 'Fresh Lime Soda', 
        description: 'Sparkling lime drink', 
        price: 40, 
        category: categoryMap['beverages'],
        isAvailable: true,
        tags: ['cold', 'refreshing', 'summer']
      },
      
      // Snacks
      { 
        name: 'Veg Sandwich', 
        description: 'Fresh vegetable sandwich with chutney', 
        price: 60, 
        category: categoryMap['snacks'],
        isAvailable: true,
        tags: ['quick', 'breakfast', 'lunch']
      },
      { 
        name: 'Pav Bhaji', 
        description: 'Spiced vegetable mash with buttered buns', 
        price: 80, 
        category: categoryMap['snacks'],
        isAvailable: true,
        tags: ['spicy', 'filling', 'popular']
      },
      
      // Meals
      { 
        name: 'Paneer Butter Masala', 
        description: 'Cottage cheese in rich tomato gravy', 
        price: 150, 
        category: categoryMap['meals'],
        isAvailable: true,
        tags: ['main course', 'vegetarian', 'spicy']
      },
      { 
        name: 'Chicken Biryani', 
        description: 'Fragrant rice with spiced chicken', 
        price: 180, 
        category: categoryMap['meals'],
        isAvailable: true,
        tags: ['main course', 'non-veg', 'spicy']
      },
      { 
        name: 'Dal Tadka', 
        description: 'Tempered lentils with spices', 
        price: 100, 
        category: categoryMap['meals'],
        isAvailable: true,
        tags: ['main course', 'vegetarian', 'comfort food']
      },
      
      // Add more items as needed
      { 
        name: 'Chocolate Milkshake', 
        description: 'Creamy chocolate milkshake', 
        price: 80, 
        category: categoryMap['beverages'],
        isAvailable: true,
        tags: ['cold', 'dessert', 'sweet']
      },
      { 
        name: 'French Fries', 
        description: 'Crispy potato fries with seasoning', 
        price: 70, 
        category: categoryMap['snacks'],
        isAvailable: true,
        tags: ['quick', 'snack', 'kids']
      },
      { 
        name: 'Veg Fried Rice', 
        description: 'Stir-fried rice with vegetables', 
        price: 120, 
        category: categoryMap['meals'],
        isAvailable: true,
        tags: ['main course', 'chinese', 'lunch']
      }
    ];

    // Add menu items
    let addedCount = 0;
    for (const item of newMenuItems) {
      const existingItem = await MenuItem.findOne({ name: item.name });
      if (!existingItem) {
        await MenuItem.create(item);
        logger.info(`Added menu item: ${item.name}`);
        addedCount++;
      } else {
        logger.info(`Menu item already exists: ${item.name}`);
      }
    }

    logger.info(`Added ${addedCount} new menu items`);
    logger.info('Menu items addition completed successfully');
    
  } catch (error: any) {
    logger.error(`Error adding menu items: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

addMenuItems();
