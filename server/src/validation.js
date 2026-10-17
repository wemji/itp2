import { z } from 'zod';
export const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(200), password: z.string().min(6).max(128) });
export const serviceSchema = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(500), location: z.string().trim().max(160), operating_hours: z.string().trim().max(100), average_service_time: z.coerce.number().int().positive().max(240), status: z.enum(['OPEN', 'CLOSED']).optional() });
export const counterSchema = z.object({ service_id: z.string().uuid(), counter_name: z.string().trim().min(1).max(80), staff_id: z.string().uuid().nullable().optional(), status: z.enum(['ACTIVE', 'OFFLINE']).optional() });
export function parse(schema, value) { const result = schema.safeParse(value); return result.success ? { data: result.data } : { error: result.error.issues.map(issue => issue.message).join(' ') }; }
