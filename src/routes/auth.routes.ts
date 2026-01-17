import { Router, Request, Response } from 'express';
import { z } from 'zod';
import User from '@/models/user.model';
import { sign } from '@/utils/jwt';
import logger from '@/utils/logger';
import { requireAuth } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { registerBody, studentRegisterBody, studentVerifyBody, studentLoginBody } from '@/validation/auth.schema';
import { sendMail } from '@/utils/email';

const router = Router();

function sanitizeUser(u: any) {
  if (!u) return u;
  const obj = typeof u.toObject === 'function' ? u.toObject() : { ...u };
  delete obj.password;
  return obj;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/register', validate({ body: registerBody }), async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email and password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const user = await User.create({ name, email, password, role });
    const token = sign({ sub: user._id.toString(), email: user.email, role: user.role });

    return res.status(201).json({ success: true, data: sanitizeUser(user), token });
  } catch (err) {
    logger.error(`Register error: ${(err as Error).message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Login schema for admin/staff (username only)
const adminLoginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Type for admin login request body
type AdminLoginBody = z.infer<typeof adminLoginSchema>;

// Admin/Staff login endpoint (username only)
router.post('/login', validate({ body: adminLoginSchema }), async (req: Request<{}, {}, AdminLoginBody>, res: Response) => {
  try {
    const { username, password } = req.body;
    
    // Find user by username only (admin/staff must use username)
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // For admin/staff, require username
    if ((user.role === 'admin' || user.role === 'staff') && !user.username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username is required for admin/staff login' 
      });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = sign({ 
      sub: user._id.toString(), 
      email: user.email, 
      username: user.username,
      role: user.role 
    });
    
    return res.status(200).json({ 
      success: true, 
      data: sanitizeUser(user), 
      token 
    });
  } catch (err) {
    logger.error(`Login error: ${(err as Error).message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { sub: string };
    const user = await User.findById(authUser.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, data: sanitizeUser(user) });
  } catch (err) {
    logger.error(`Me error: ${(err as Error).message}`);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

export default router;
