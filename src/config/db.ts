import mongoose from 'mongoose';
import config from '@/config/config';
import logger from '@/utils/logger';

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('✅ Connected to MongoDB');
  } catch (error) {
    logger.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;