import dotenv from 'dotenv';
import path from 'path';
import { cleanEnv, str, port as envalidPort } from 'envalid';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: envalidPort({ default: 5000 }),
  MONGO_URI: str(),
  JWT_SECRET: str(),
  JWT_EXPIRES_IN: str({ default: '7d' }),
  LOG_LEVEL: str({ choices: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'], default: 'info' }),
  CORS_ORIGIN: str({ default: '' }),
  FRONTEND_URL: str({ default: '' }),
  SMTP_HOST: str({ default: '' }),
  SMTP_PORT: str({ default: '' }),
  SMTP_USER: str({ default: '' }),
  SMTP_PASS: str({ default: '' }),
  SMTP_FROM: str({ default: '' }),
});

const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  mongoUri: env.MONGO_URI,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  logLevel: env.LOG_LEVEL,
  corsOrigin: env.CORS_ORIGIN,
  frontendUrl: env.FRONTEND_URL,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : undefined,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM || 'no-reply@canteen.local',
  },
};

export default config;