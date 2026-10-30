import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePublicStats } from '../src/publicStats.js';

test('summarizes anonymous queue activity without returning record details', () => {
  const result = summarizePublicStats({
    services: [
      { id: 'service-a', average_service_time: 5 },
      { id: 'service-b', average_service_time: 10 },
    ],
    waitingQueues: [
      { service_id: 'service-a' },
      { service_id: 'service-a' },
      { service_id: 'service-b' },
      { service_id: 'closed-service' },
    ],
    completedToday: 12,
    updatedAt: '2026-10-31T00:00:00.000Z',
  });

  assert.deepEqual(result, {
    openServices: 2,
    peopleWaiting: 3,
    typicalWaitMinutes: 10,
    completedToday: 12,
    updatedAt: '2026-10-31T00:00:00.000Z',
  });
  assert.equal('service_id' in result, false);
  assert.equal('queue_number' in result, false);
});

test('returns zero-safe statistics when no services are open', () => {
  const result = summarizePublicStats({ updatedAt: '2026-10-31T00:00:00.000Z' });
  assert.equal(result.openServices, 0);
  assert.equal(result.peopleWaiting, 0);
  assert.equal(result.typicalWaitMinutes, 0);
  assert.equal(result.completedToday, 0);
});
