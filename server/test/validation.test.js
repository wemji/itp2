import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, serviceSchema, parse } from '../src/validation.js';

test('validates registration data', () => {
  assert.equal(parse(registerSchema, { name: 'Juan Dela Cruz', email: 'juan@example.com', password: 'secret123' }).error, undefined);
  assert.ok(parse(registerSchema, { name: 'J', email: 'bad', password: 'x' }).error);
});

test('validates service data', () => {
  assert.equal(parse(serviceSchema, { name: 'Registrar', description: '', location: 'Main Building', operating_hours: '8:00 AM – 5:00 PM', average_service_time: 5 }).error, undefined);
  assert.ok(parse(serviceSchema, { name: 'Registrar', description: '', location: 'Main Building', operating_hours: '8-5', average_service_time: 5 }).error);
  assert.ok(parse(serviceSchema, { name: 'Registrar', description: '', location: 'Main Building', operating_hours: '5:00 PM – 8:00 AM', average_service_time: 5 }).error);
  assert.ok(parse(serviceSchema, { name: '', average_service_time: 0 }).error);
});
