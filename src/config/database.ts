import mongoose, { Connection, ConnectOptions } from 'mongoose';

// Use the MongoDB Atlas connection string from environment variables
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('MongoDB connection string (MONGO_URI) is not defined in environment variables');
}

// Enable debug mode in development
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);
}

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Successfully connected to MongoDB Atlas');
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Host: ${mongoose.connection.host}`);
});

mongoose.connection.on('error', (err: Error) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

export async function connectToDatabase(): Promise<Connection> {
  try {
    if (mongoose.connection.readyState >= 1) {
      console.log('Using existing database connection');
      return mongoose.connection;
    }

    console.log('Connecting to MongoDB Atlas...');
    
    const options: ConnectOptions = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10, // Maximum number of connections in the connection pool
      retryWrites: true,
      w: 'majority',
      retryReads: true,
      appName: 'canteen-backend',
      tls: true, // Enable TLS/SSL for Atlas
      tlsAllowInvalidCertificates: false,
    };

    await mongoose.connect(MONGO_URI as string, options);
    
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas:', error);
    process.exit(1);
  }
}

export async function disconnectFromDatabase() {
  try {
    if (mongoose.connection.readyState === 0) {
      return; // Already disconnected
    }

    if (process.env.NODE_ENV === 'test') {
      await mongoose.connection.dropDatabase();
      console.log('Dropped test database');
    }
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
    process.exit(1);
  }
}