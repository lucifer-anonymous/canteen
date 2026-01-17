import { Router, Request, Response } from 'express';
import User from '@/models/user.model';
import { sign } from '@/utils/jwt';
import logger from '@/utils/logger';
import { requireAuth } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { z } from 'zod';

const router = Router();

function sanitizeUser(u: any) {
  if (!u) return u;
  const obj = typeof u.toObject === 'function' ? u.toObject() : { ...u };
  delete obj.password;
  delete obj.otpCode;
  delete obj.otpExpiresAt;
  return obj;
}

// Validation schemas for admin/staff
const adminRegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'staff']).optional().default('staff'),
});

const adminLoginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// POST /register - Admin/Staff registration (protected - only admin can create)
router.post('/register', validate({ body: adminRegisterSchema }), async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.info(`[${requestId}] === ADMIN/STAFF REGISTRATION REQUEST STARTED ===`);
    
    const { name, username, email, password, role } = req.body as {
      name: string;
      username: string;
      email: string;
      password: string;
      role: 'admin' | 'staff';
    };
    
    logger.info(`[${requestId}] Registration data:`, { 
      username: username?.substring(0, 5) + '***',
      email: email?.substring(0, 5) + '***',
      role 
    });
    
    // Validate required fields
    if (!name || !username || !email || !password) {
      logger.error(`[${requestId}] Missing required fields`);
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      logger.warn(`[${requestId}] User already exists with username or email`);
      
      if (existingUser.username === username) {
        return res.status(409).json({ 
          success: false, 
          message: 'Username already in use. Please choose a different username.' 
        });
      }
      
      if (existingUser.email === email) {
        return res.status(409).json({ 
          success: false, 
          message: 'Email already in use. Please use a different email.' 
        });
      }
    }

    // Create new admin/staff user
    const user = await User.create({
      name,
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password, // Will be hashed by pre-save hook
      role: role || 'staff',
      isVerified: true, // Admin/staff are auto-verified
    });

    logger.info(`[${requestId}] User created successfully:`, {
      id: user._id,
      username: user.username,
      role: user.role
    });

    // Generate JWT token
    const token = sign({ 
      sub: user._id.toString(), 
      email: user.email,
      username: user.username,
      role: user.role 
    });
    
    logger.info(`[${requestId}] Registration successful, sending response`);
    
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: sanitizeUser(user),
      token
    });
  } catch (err) {
    const error = err as Error;
    const errorId = `err_${Date.now()}`;
    
    logger.error(`[${requestId}] === REGISTRATION ERROR (${errorId}) ===`);
    logger.error(`[${requestId}] Error details:`, {
      errorId,
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: error.message 
      });
    }
    
    if (error.name === 'MongoError' || error.message.includes('E11000') || error.message.includes('duplicate key')) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username or email already in use' 
      });
    }
    
    // Default error response
    return res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /login - Admin/Staff login
router.post('/login', validate({ body: adminLoginSchema }), async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.info(`[${requestId}] === ADMIN/STAFF LOGIN REQUEST STARTED ===`);
    
    const { username, password } = req.body as {
      username: string;
      password: string;
    };
    
    logger.info(`[${requestId}] Login attempt for username: ${username?.substring(0, 5) + '***'}`);
    
    // Validate required fields
    if (!username || !password) {
      logger.error(`[${requestId}] Missing credentials`);
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Find user by username
    const user = await User.findOne({ 
      username: username.toLowerCase().trim() 
    });

    if (!user) {
      logger.warn(`[${requestId}] User not found: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }
    
    // Verify user is admin or staff
    if (user.role !== 'admin' && user.role !== 'staff') {
      logger.warn(`[${requestId}] User is not admin/staff: ${username}, role: ${user.role}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. This login is for admin and staff only.' 
      });
    }

    logger.info(`[${requestId}] User found: ${user.username}, role: ${user.role}`);

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      logger.warn(`[${requestId}] Invalid password for user: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    logger.info(`[${requestId}] Password validated successfully`);

    // Generate JWT token
    const token = sign({ 
      sub: user._id.toString(), 
      email: user.email,
      username: user.username,
      role: user.role 
    });
    
    logger.info(`[${requestId}] Login successful for user: ${user.username}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      data: sanitizeUser(user), 
      token 
    });
  } catch (err) {
    const error = err as Error;
    const errorId = `err_${Date.now()}`;
    
    logger.error(`[${requestId}] === LOGIN ERROR (${errorId}) ===`);
    logger.error(`[${requestId}] Error details:`, {
      errorId,
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /me - Get current admin/staff user
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    const authUser = (req as any).user as { sub: string; role: string };
    
    logger.info(`[${requestId}] Fetching user data for: ${authUser.sub}`);
    
    // Verify user is admin or staff
    if (authUser.role !== 'admin' && authUser.role !== 'staff') {
      logger.warn(`[${requestId}] Unauthorized access attempt, role: ${authUser.role}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    const user = await User.findById(authUser.sub);
    
    if (!user) {
      logger.warn(`[${requestId}] User not found: ${authUser.sub}`);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    logger.info(`[${requestId}] User data retrieved successfully`);
    
    return res.status(200).json({ 
      success: true, 
      data: sanitizeUser(user) 
    });
  } catch (err) {
    const error = err as Error;
    logger.error(`[${requestId}] Error fetching user:`, error.message);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
