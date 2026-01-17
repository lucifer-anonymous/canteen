import { disconnectFromDatabase } from '../src/config/database';

module.exports = async () => {
  try {
    await disconnectFromDatabase();
  } catch (error) {
    console.error('Error during global teardown:', error);
    process.exit(1);
  }
};
