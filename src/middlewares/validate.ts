import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import logger from '@/utils/logger';

export type SchemaBundle = {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
};

export function validate(schema: SchemaBundle) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info('Validation middleware - Request body:', req.body);
      
      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) {
          logger.error('Validation error:', result.error);
          return res.status(400).json({ 
            success: false, 
            message: 'Validation failed', 
            errors: result.error.flatten() 
          });
        }
        req.body = result.data;
      }
      
      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) {
          logger.error('Query validation error:', result.error);
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid query parameters', 
            errors: result.error.flatten() 
          });
        }
        // Store validated query in a new property instead of modifying req.query directly
        (req as any).validatedQuery = result.data;
      }
      
      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) {
          logger.error('Params validation error:', result.error);
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid URL parameters', 
            errors: result.error.flatten() 
          });
        }
        // Store validated params in a new property instead of modifying req.params directly
        (req as any).validatedParams = result.data;
      }
      
      return next();
    } catch (error: unknown) {
      logger.error('Unexpected validation error:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: error.flatten() 
        });
      }
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error during validation' 
      });
    }
  };
}
