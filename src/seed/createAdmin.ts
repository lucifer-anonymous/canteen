import mongoose from 'mongoose';
import { hashPassword } from '../utils/auth';
import User from '../models/user.model';

// Use your MongoDB Atlas connection string
const MONGO_URI = 'mongodb+srv://canteenAdmin:8YYU4RhR3txLJwJs@canteen.drllvkb.mongodb.net/canteen?retryWrites=true&w=majority';

async function createAdminUser() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('Connected to MongoDB Atlas');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('Username: admin');
      console.log('If you forgot the password, you can reset it in the database');
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const hashedPassword = await hashPassword('Admin@123');
    
    const adminUser = new User({
      username: 'admin',
      email: 'admin@canteen.com',
      password: hashedPassword,
      role: 'admin',
      name: 'System Administrator',
      isVerified: true,
      isActive: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log('Database: canteen');
    console.log('Username: admin');
    console.log('Password: Admin@123');
    console.log('\nYou can now log in with these credentials');

  } catch (error) {
    console.error('❌ Error creating admin user:');
    console.error(error);
    console.log('\nTroubleshooting:');
    console.log('1. Check your MongoDB Atlas connection string');
    console.log('2. Verify your IP is whitelisted in MongoDB Atlas Network Access');
    console.log('3. Check if the database user has proper permissions');
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdminUser();
