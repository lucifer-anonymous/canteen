import winston from 'winston';
import config from '@/config/config';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const { combine, timestamp, printf, colorize, align, errors, json, prettyPrint } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  let logMessage = `[${timestamp}] ${level}: ${message}`;
  
  // Add metadata if it exists
  if (Object.keys(meta).length > 0) {
    logMessage += '\n' + JSON.stringify(meta, null, 2);
  }
  
  return logMessage;
});

const logger = winston.createLogger({
  level: 'debug', // Set to debug to see all logs
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD hh:mm:ss.SSS A',
    }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'canteen-backend' },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    }),
    // Write all logs with level `debug` and below to `combined.log`
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      format: combine(
        timestamp(),
        json()
      )
    }),
    // Console transport with colorized output
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp(),
        consoleFormat
      )
    })
  ],
  exitOnError: false
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp(),
      consoleFormat
    )
  }));
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

export default logger;