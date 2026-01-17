import { OpenAPIV3 } from 'openapi-types';

const swaggerSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Canteen API',
    version: '1.0.0',
    description: 'API documentation for the Canteen Management System',
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'staff', 'student'] },
        },
      },
      Category: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          sortOrder: { type: 'number' },
        },
      },
      MenuItem: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          imageUrl: { type: 'string' },
          category: { $ref: '#/components/schemas/Category' },
          isAvailable: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                menuItem: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' },
                qty: { type: 'number' },
              },
            },
          },
          subtotal: { type: 'number' },
          total: { type: 'number' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                menuItem: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' },
                qty: { type: 'number' },
              },
            },
          },
          subtotal: { type: 'number' },
          total: { type: 'number' },
          status: { type: 'string', enum: ['placed', 'preparing', 'ready', 'served', 'cancelled'] },
        },
      },
    },
  },
  paths: {
    '/api/v1/auth/register': {
      post: {
        summary: 'Register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'staff', 'student'] },
                },
                required: ['name', 'email', 'password'],
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/v1/auth/login': {
      post: {
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/auth/me': {
      get: {
        summary: 'Current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/api/v1/categories': {
      get: { summary: 'List categories', responses: { '200': { description: 'OK' } } },
    },
    '/api/v1/menu': {
      get: { summary: 'List menu items', responses: { '200': { description: 'OK' } } },
    },
    '/api/v1/cart': {
      get: { summary: 'Get my cart', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
      delete: { summary: 'Clear cart', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/api/v1/cart/items': {
      post: { summary: 'Add item to cart', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/api/v1/orders': {
      post: { summary: 'Place order', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Created' } } },
      get: { summary: 'List my orders', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
  },
};

export default swaggerSpec;
