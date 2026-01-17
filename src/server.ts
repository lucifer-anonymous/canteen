// This file is the entry point for the application
import app from './app';
import config from './config/config';
import logger from './utils/logger';
import connectDB from './config/db';

const PORT = config.port || 5000;

// Only start the server if this file is being run directly
if (require.main === module) {
  // Connect to MongoDB
  connectDB();

  // Start the server
  const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    console.log(`Server is running on port ${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err: Error) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
  });
}

export default app;