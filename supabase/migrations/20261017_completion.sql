-- Apply this migration to an existing ONEQUEUE Supabase project.
alter table if exists public.users add column if not exists is_active boolean not null default true;
alter table if exists public.notifications add column if not exists external_delivery_status text not null default 'not_configured';
alter table if exists public.notifications add column if not exists external_sent_at timestamptz;

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and is_active and role in ('admin','staff'));
$$;
