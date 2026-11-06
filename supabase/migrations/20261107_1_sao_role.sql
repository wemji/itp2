-- Add the SAO (Student Affairs Office) desk role.
-- Run this on its own, before 20261107_2_sao_department.sql: Postgres cannot use a new
-- enum value in the same transaction that adds it.
alter type public.user_role add value if not exists 'sao';
