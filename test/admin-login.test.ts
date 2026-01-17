import request from 'supertest';
import app from '../src/app';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/database';
import User from '../src/models/user.model';
import { hashPassword } from '../src/utils/auth';
import { sign } from '../src/utils/jwt';

// Test admin user
const TEST_ADMIN = {
  username: 'testadmin',
  password: 'Password123!',
  email: 'admin@test.com',
  name: 'Test Admin',
  role: 'admin'
};

// Test staff user
const TEST_STAFF = {
  username: 'teststaff',
  password: 'Password123!',
  email: 'staff@test.com',
  name: 'Test Staff',
  role: 'staff'
};

beforeAll(async () => {
  await connectToDatabase();
  
  // Create test users
  await User.deleteMany({ 
    $or: [
      { email: { $in: [TEST_ADMIN.email, TEST_STAFF.email] } },
      { username: { $in: [TEST_ADMIN.username, TEST_STAFF.username] } }
    ] 
  });

  // Create hashed passwords
  const adminPassword = await hashPassword(TEST_ADMIN.password);
  const staffPassword = await hashPassword(TEST_STAFF.password);

  // Create test users in the database
  await User.create({
    ...TEST_ADMIN,
    password: adminPassword
  });

  await User.create({
    ...TEST_STAFF,
    password: staffPassword
  });
});

afterAll(async () => {
  await User.deleteMany({ 
    $or: [
      { email: { $in: [TEST_ADMIN.email, TEST_STAFF.email] } },
      { username: { $in: [TEST_ADMIN.username, TEST_STAFF.username] } }
    ] 
  });
  await disconnectFromDatabase();
});

describe('Admin/Staff Login', () => {
  it('should login admin with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: TEST_ADMIN.username,
        password: TEST_ADMIN.password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('username', TEST_ADMIN.username);
    expect(res.body.data).toHaveProperty('role', 'admin');
  });

  it('should login staff with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: TEST_STAFF.username,
        password: TEST_STAFF.password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('username', TEST_STAFF.username);
    expect(res.body.data).toHaveProperty('role', 'staff');
  });

  it('should not login with incorrect password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: TEST_ADMIN.username,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });

  it('should not login with non-existent username', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'nonexistent',
        password: 'somepassword'
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'Invalid credentials');
  });
});
