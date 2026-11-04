import type { ZodSchema } from 'zod';
import { badRequest, zodMessage } from './errors.js';

export function parseBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(zodMessage(result.error), result.error.flatten());
  }
  return result.data;
}

export function parseQuery<T>(schema: ZodSchema<T>, data: unknown): T {
  return parseBody(schema, data);
}
