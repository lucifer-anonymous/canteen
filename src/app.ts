import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import config from './config/config';
import logger from './utils/logger';
import authRoutes from './routes/auth.routes';
import catalogRoutes from './routes/catalog.routes';
import adminRoutes from './routes/admin.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import studentRoutes from './routes/student.routes';
import adminAuthRoutes from './routes/admin-auth.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger';

const app = express();

// Middleware
// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://10.82.240.229:8080',
  'http://10.82.240.229:5173'
  'https://cns-lime.vercel.app'
];

// Add production CORS origin from environment variable
if (config.corsOrigin) {
  const productionOrigins = config.corsOrigin.split(',').map((origin: string) => origin.trim());
  allowedOrigins.push(...productionOrigins);
}

// Skip authentication for specific paths
const skipAuthPaths = [
  '/api/v1/student/register',
  '/api/v1/student/login',
  '/api/v1/student/verify',
  '/api/v1/admin-auth/login',
  '/api/v1/admin-auth/register',
  '/health',
  '/api-docs'
];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow all origins in development
    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      logger.warn(msg);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public routes (no authentication required)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', catalogRoutes);

// Student routes - handle authentication at the route level
app.use('/api/v1/student', studentRoutes);

// Admin authentication routes (login/register)
app.use('/api/v1/admin-auth', adminAuthRoutes);

// Protected routes (require authentication)
app.use((req, res, next) => {
  // Skip authentication for specific paths
  // Use req.originalUrl or req.url instead of req.path to get the full path
  const fullPath = req.originalUrl || req.url;
  if (skipAuthPaths.some(path => fullPath.startsWith(path))) {
    return next();
  }
  // Apply authentication middleware to all other routes
  require('@/middlewares/auth').requireAuth(req, res, next);
});

// Protected routes
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', cartRoutes);
app.use('/api/v1', orderRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    ...(config.nodeEnv === 'development' && { error: err.message }),
  });
});

export default app;
