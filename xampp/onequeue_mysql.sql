-- ONEQUEUE — MySQL / MariaDB copy of the Supabase database (for XAMPP + phpMyAdmin).
--
-- The live app still runs on Supabase (PostgreSQL). This database is a read-only mirror:
-- fill it with `npm run sync:mysql --workspace server` after Supabase keys are configured.
--
-- Mirrors supabase/schema.sql plus every migration in supabase/migrations.
-- Differences from PostgreSQL:
--   * UUIDs are stored as CHAR(36); timestamps as DATETIME in UTC.
--   * Supabase-only features are not copied: auth.users, row-level security policies,
--     the join_queue/call_next_queue functions, and realtime.
--   * "One active queue per user" was a partial unique index in PostgreSQL; MariaDB has no
--     partial indexes, so it is a plain index here (Supabase still enforces the rule).

CREATE DATABASE IF NOT EXISTS onequeue CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE onequeue;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS activity_logs, queue_status_history, queue_history, notifications, queues, counters, services, users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(200) NOT NULL,
  role ENUM('admin', 'staff', 'customer', 'registrar', 'finance', 'sao') NOT NULL DEFAULT 'customer',
  department ENUM('registrar', 'finance', 'sao') NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY users_email_unique (email),
  KEY users_role_idx (role)
) ENGINE=InnoDB;

CREATE TABLE services (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(160) NOT NULL DEFAULT '',
  operating_hours VARCHAR(100) NOT NULL DEFAULT '8:00 AM - 5:00 PM',
  average_service_time INT NOT NULL DEFAULT 5,
  status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  department ENUM('registrar', 'finance', 'sao') NOT NULL DEFAULT 'registrar',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT services_average_time_positive CHECK (average_service_time > 0),
  KEY services_department_status_idx (department, status)
) ENGINE=InnoDB;

CREATE TABLE counters (
  id CHAR(36) NOT NULL PRIMARY KEY,
  service_id CHAR(36) NOT NULL,
  staff_id CHAR(36) NULL,
  counter_name VARCHAR(80) NOT NULL,
  status ENUM('ACTIVE', 'OFFLINE') NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT counters_service_fk FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT counters_staff_fk FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE queues (
  id CHAR(36) NOT NULL PRIMARY KEY,
  queue_number VARCHAR(20) NOT NULL,
  user_id CHAR(36) NOT NULL,
  service_id CHAR(36) NOT NULL,
  status ENUM('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'NO-SHOW') NOT NULL DEFAULT 'WAITING',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  called_at DATETIME NULL,
  serving_at DATETIME NULL,
  completed_at DATETIME NULL,
  estimated_wait_time INT NOT NULL DEFAULT 0,
  counter_id CHAR(36) NULL,
  processed_by CHAR(36) NULL,
  CONSTRAINT queues_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT queues_service_fk FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  CONSTRAINT queues_counter_fk FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL,
  CONSTRAINT queues_processed_by_fk FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY queues_user_status_idx (user_id, status),
  KEY queues_service_status_joined_idx (service_id, status, joined_at)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  queue_id CHAR(36) NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  external_delivery_status VARCHAR(40) NOT NULL DEFAULT 'not_configured',
  external_sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notifications_queue_fk FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE,
  KEY notifications_user_created_idx (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE queue_history (
  id CHAR(36) NOT NULL PRIMARY KEY,
  queue_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  service_id CHAR(36) NOT NULL,
  queue_number VARCHAR(20) NOT NULL,
  status ENUM('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'NO-SHOW') NOT NULL,
  waiting_time INT NOT NULL DEFAULT 0,
  service_time INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY queue_history_one_record_per_queue (queue_id),
  CONSTRAINT queue_history_queue_fk FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE,
  CONSTRAINT queue_history_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT queue_history_service_fk FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE queue_status_history (
  id CHAR(36) NOT NULL PRIMARY KEY,
  queue_id CHAR(36) NOT NULL,
  from_status ENUM('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'NO-SHOW') NULL,
  to_status ENUM('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'NO-SHOW') NOT NULL,
  changed_by CHAR(36) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT queue_status_history_queue_fk FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE,
  CONSTRAINT queue_status_history_user_fk FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY queue_status_history_queue_changed_idx (queue_id, changed_at)
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  actor_id CHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id CHAR(36) NULL,
  metadata LONGTEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(metadata)),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activity_logs_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY activity_logs_created_idx (created_at),
  KEY activity_logs_actor_created_idx (actor_id, created_at)
) ENGINE=InnoDB;
