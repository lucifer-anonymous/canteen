import { Schema, model } from 'mongoose';
import { connectToDatabase } from '../config/database';

async function up() {
  try {
    const db = await connectToDatabase();
    
    // Add username field to users collection
    await db.collection('users').updateMany(
      { username: { $exists: false } },
      { $set: { username: null } }
    );
    
    // Create a unique index on the username field
    await db.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true });
    
    console.log('Migration up completed: Added username field to users collection');
  } catch (error) {
    console.error('Migration up failed:', error);
    throw error;
  }
}

async function down() {
  try {
    const db = await connectToDatabase();
    
    // Remove the username field from all documents
    await db.collection('users').updateMany(
      {},
      { $unset: { username: '' } }
    );
    
    // Drop the username index
    await db.collection('users').dropIndex('username_1');
    
    console.log('Migration down completed: Removed username field from users collection');
  } catch (error) {
    console.error('Migration down failed:', error);
    throw error;
  }
}

// Export the migration functions
module.exports = { up, down };
