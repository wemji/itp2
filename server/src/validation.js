import { z } from 'zod';

export const uuidSchema = z.string().uuid('Invalid record identifier.');

export const nameSchema = z.string()
  .trim()
  .min(2, 'Name must contain at least 2 characters.')
  .max(80, 'Name cannot exceed 80 characters.')
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u, 'Name contains unsupported characters.');

export const emailSchema = z.string()
  .trim()
  .email('Enter a valid email address.')
  .max(200, 'Email cannot exceed 200 characters.')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z.string()
  .min(8, 'Password must contain at least 8 characters.')
  .max(128, 'Password cannot exceed 128 characters.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
}).strict();

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500),
  location: z.string().trim().max(160),
  operating_hours: z.string().trim().min(2).max(100),
  average_service_time: z.coerce.number().int().positive().max(240),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
}).strict();

export const counterSchema = z.object({
  service_id: uuidSchema,
  counter_name: z.string().trim().min(1).max(80),
  staff_id: uuidSchema.nullable().optional(),
  status: z.enum(['ACTIVE', 'OFFLINE']).optional(),
}).strict();

export function parse(schema, value) {
  const result = schema.safeParse(value);
  return result.success
    ? { data: result.data }
    : { error: result.error.issues.map((issue) => issue.message).join(' ') };
}
