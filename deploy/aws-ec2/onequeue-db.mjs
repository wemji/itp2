// Read-only database viewer for the ONEQUEUE server. Installed as `onequeue-db`.
// Usage on the server:  sudo onequeue-db            (overview of every table)
//                       sudo onequeue-db <table>    (latest 20 rows of one table)
import { createRequire } from 'node:module';
const require = createRequire('/opt/onequeue/server/package.json');
const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TABLES = {
  users: ['name', 'email', 'role', 'department', 'is_active', 'created_at'],
  services: ['name', 'department', 'status', 'location', 'operating_hours', 'average_service_time'],
  counters: ['counter_name', 'status', 'service_id', 'staff_id'],
  queues: ['queue_number', 'status', 'joined_at', 'called_at', 'completed_at'],
  queue_history: ['queue_number', 'status', 'waiting_time', 'service_time', 'created_at'],
  notifications: ['title', 'is_read', 'created_at'],
  queue_status_history: ['from_status', 'to_status', 'changed_at'],
  activity_logs: ['action', 'target_type', 'created_at'],
};
const ORDER = { users: 'created_at', services: 'name', counters: 'counter_name', queues: 'joined_at', queue_history: 'created_at', notifications: 'created_at', queue_status_history: 'changed_at', activity_logs: 'created_at' };

const show = (v) => (v === null || v === undefined ? '-' : /T\d\d:/.test(String(v)) ? new Date(v).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : String(v));
async function printTable(name, limit) {
  const cols = TABLES[name];
  const { data, error, count } = await db.from(name).select(cols.join(','), { count: 'exact' }).order(ORDER[name], { ascending: name === 'services' || name === 'counters' }).limit(limit);
  if (error) return console.log(`  ${name}: error - ${error.message}`);
  console.log(`\n== ${name} (${count} rows)${count > limit ? `, showing latest ${limit}` : ''}`);
  if (!data.length) return console.log('  (empty)');
  const rows = data.map((r) => cols.map((c) => show(r[c]).slice(0, 34)));
  const widths = cols.map((c, i) => Math.max(c.length, ...rows.map((r) => r[i].length)));
  console.log('  ' + cols.map((c, i) => c.padEnd(widths[i])).join('  '));
  console.log('  ' + widths.map((w) => '-'.repeat(w)).join('  '));
  rows.forEach((r) => console.log('  ' + r.map((v, i) => v.padEnd(widths[i])).join('  ')));
}

const only = process.argv[2];
console.log(`ONEQUEUE database (Supabase PostgreSQL)\nHost: ${new URL(process.env.SUPABASE_URL).host}`);
if (only) {
  if (!TABLES[only]) { console.log(`Unknown table. Choose one of: ${Object.keys(TABLES).join(', ')}`); process.exit(1); }
  await printTable(only, 20);
} else {
  for (const name of Object.keys(TABLES)) await printTable(name, 5);
  console.log(`\nTip: sudo onequeue-db <table>   e.g.  sudo onequeue-db queues`);
}
