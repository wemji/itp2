# ONEQUEUE database copy in XAMPP

The app runs on **Supabase** (PostgreSQL). This folder holds a matching **MySQL/MariaDB copy** of the same tables, which you can browse in phpMyAdmin. The app does not read from or write to it.

## Set up (once)

1. Open the **XAMPP Control Panel** and start **MySQL** (and **Apache** if you want phpMyAdmin).
2. In phpMyAdmin (http://localhost/phpmyadmin), open the **Import** tab, choose `xampp/onequeue_mysql.sql` and click **Go**. You can also run this from the project folder:
   ```
   C:\xampp\mysql\bin\mysql.exe -u root < xampp\onequeue_mysql.sql
   ```
   This creates the `onequeue` database with 8 tables: users, services, counters, queues, notifications, queue_history, queue_status_history and activity_logs.

   **Warning:** importing this file again drops and recreates every table, so all copied data is erased.

## Copy data from Supabase

1. Put your real `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`.
2. With XAMPP MySQL running, run this from the project folder:
   ```
   npm run sync:mysql --workspace server
   ```
   Run it again whenever you want a fresh copy. Existing rows are updated, not duplicated.

If your MySQL root user has a password, or MySQL isn't on port 3306, add any of these to `server/.env`: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.

## What isn't copied

These belong to Supabase and have no MySQL equivalent: sign-in accounts and passwords (`auth.users`), row-level security policies, the `join_queue`/`call_next_queue` functions, and realtime updates. Times are stored in UTC.
