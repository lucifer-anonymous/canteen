import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';
import { verify } from '@/utils/jwt';

export interface AuthPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return next();
  };
}

// Paths that don't require authentication
const publicPaths = [
  '/api/v1/student/register',
  '/api/v1/student/login',
  '/api/v1/student/verify',
  '/api/v1/auth/'
];

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Skip authentication for public paths
  const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
  if (isPublicPath) {
    return next();
  }

  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    
    if (!token) {
      logger.warn('No token provided');
      return res.status(401).json({ success: false, message: 'No authentication token provided' });
    }

    const payload = verify<AuthPayload>(token);
    (req as any).user = payload;
    return next();
  } catch (err) {
    const error = err as Error;
    logger.warn(`Authentication error: ${error.message}`, {
      path: req.path,
      method: req.method,
      error: error.stack
    });
    
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
