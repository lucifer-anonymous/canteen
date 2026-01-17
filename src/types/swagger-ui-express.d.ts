declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';
  
  interface SwaggerUiOptions {
    explorer?: boolean;
    [key: string]: any;
  }

  interface SwaggerUi {
    serve: RequestHandler[];
    setup: (spec: any, options?: SwaggerUiOptions) => RequestHandler;
  }

  const swaggerUi: SwaggerUi;
  export = swaggerUi;
}
