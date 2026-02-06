import { z } from 'zod';
import { insertProductSchema, products } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  rateLimit: z.object({
    message: z.string(),
    retryAfter: z.number().optional(),
  }),
};

export const api = {
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      input: z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).default(20),
        category: z.string().optional(),
        minPrice: z.coerce.number().optional(),
        maxPrice: z.coerce.number().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.object({
          items: z.array(z.custom<typeof products.$inferSelect>()),
          nextCursor: z.string().optional(),
        }),
        429: errorSchemas.rateLimit,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id',
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
        429: errorSchemas.rateLimit,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products',
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  // Endpoints to test reliability features
  integrations: {
    sync: {
      method: 'POST' as const,
      path: '/api/integrations/sync',
      input: z.object({
        forceFailure: z.boolean().optional(), // Simulate external API failure
      }),
      responses: {
        200: z.object({
          success: z.boolean(),
          data: z.any(),
          source: z.enum(['cache', 'api']),
          duration: z.number(),
        }),
        503: errorSchemas.internal, // Circuit breaker open
      },
    },
    webhook: {
      method: 'POST' as const,
      path: '/api/integrations/webhook',
      input: z.object({
        eventId: z.string(),
        eventType: z.string(),
        payload: z.record(z.any()),
      }),
      responses: {
        200: z.object({ status: z.string(), processed: z.boolean() }),
        400: errorSchemas.validation,
      },
    },
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats',
      responses: {
        200: z.object({
          circuitBreakerStatus: z.enum(['closed', 'open', 'half-open']),
          cacheHitRate: z.number(),
          activeRequests: z.number(),
          webhookProcessedCount: z.number(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
