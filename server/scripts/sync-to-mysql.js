// Copies every ONEQUEUE table from Supabase into the XAMPP MySQL/MariaDB mirror.
// Usage:  npm run sync:mysql --workspace server
// Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server/.env) and the schema from xampp/onequeue_mysql.sql.
// Optional MySQL settings: MYSQL_HOST (127.0.0.1), MYSQL_PORT (3306), MYSQL_USER (root), MYSQL_PASSWORD (''), MYSQL_DATABASE (onequeue).
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';

// Parents before children so foreign keys are satisfied.
const TABLES = {
  users: ['id', 'name', 'email', 'role', 'department', 'is_active', 'created_at'],
  services: ['id', 'name', 'description', 'location', 'operating_hours', 'average_service_time', 'status', 'department', 'created_at'],
  counters: ['id', 'service_id', 'staff_id', 'counter_name', 'status'],
  queues: ['id', 'queue_number', 'user_id', 'service_id', 'status', 'joined_at', 'called_at', 'serving_at', 'completed_at', 'estimated_wait_time', 'counter_id', 'processed_by'],
  notifications: ['id', 'user_id', 'queue_id', 'title', 'message', 'is_read', 'external_delivery_status', 'external_sent_at', 'created_at'],
  queue_history: ['id', 'queue_id', 'user_id', 'service_id', 'queue_number', 'status', 'waiting_time', 'service_time', 'created_at'],
  queue_status_history: ['id', 'queue_id', 'from_status', 'to_status', 'changed_by', 'changed_at'],
  activity_logs: ['id', 'actor_id', 'action', 'target_type', 'target_id', 'metadata', 'created_at'],
};
const TIMESTAMP = /(_at)$/;
const PAGE = 1000;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || /your-project|placeholder/.test(url + key)) {
  console.error('Set real SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY values in server/.env before syncing.');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// PostgreSQL ISO timestamps -> MySQL DATETIME (UTC).
const toMysql = (column, value) => {
  if (value === null || value === undefined) return null;
  if (TIMESTAMP.test(column)) return new Date(value).toISOString().slice(0, 19).replace('T', ' ');
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
};

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1);
    if (error) throw new Error(`Reading ${table} from Supabase failed: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'onequeue',
});

try {
  await db.query("SET time_zone = '+00:00'");
  await db.beginTransaction();
  for (const [table, columns] of Object.entries(TABLES)) {
    const rows = await fetchAll(table);
    if (rows.length) {
      const updates = columns.filter((c) => c !== 'id').map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
      const sql = `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES ? ON DUPLICATE KEY UPDATE ${updates}`;
      for (let i = 0; i < rows.length; i += 500) {
        await db.query(sql, [rows.slice(i, i + 500).map((row) => columns.map((c) => toMysql(c, row[c])))]);
      }
    }
    console.log(`${table.padEnd(22)} ${rows.length} rows`);
  }
  await db.commit();
  console.log('Sync complete. Open http://localhost/phpmyadmin to browse the onequeue database.');
} catch (error) {
  await db.rollback();
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
