-- Run in Supabase SQL Editor. Auth users are mirrored into public.users by the trigger.
create extension if not exists pgcrypto;

do $$ begin create type public.user_role as enum ('admin', 'staff', 'customer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.service_status as enum ('OPEN', 'CLOSED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.queue_status as enum ('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'NO-SHOW'); exception when duplicate_object then null; end $$;
do $$ begin create type public.counter_status as enum ('ACTIVE', 'OFFLINE'); exception when duplicate_object then null; end $$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.services (
  id uuid primary key default gen_random_uuid(), name text not null, description text not null default '',
  location text not null default '', operating_hours text not null default '8:00 AM - 5:00 PM',
  average_service_time integer not null default 5 check (average_service_time > 0),
  status public.service_status not null default 'OPEN', created_at timestamptz not null default now()
);
create table public.counters (
  id uuid primary key default gen_random_uuid(), service_id uuid not null references public.services(id) on delete cascade,
  staff_id uuid references public.users(id) on delete set null, counter_name text not null,
  status public.counter_status not null default 'ACTIVE'
);
create table public.queues (
  id uuid primary key default gen_random_uuid(), queue_number text not null, user_id uuid not null references public.users(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict, status public.queue_status not null default 'WAITING',
  joined_at timestamptz not null default now(), called_at timestamptz, serving_at timestamptz, completed_at timestamptz,
  estimated_wait_time integer not null default 0, counter_id uuid references public.counters(id) on delete set null
);
create unique index one_active_queue_per_user on public.queues(user_id) where status in ('WAITING', 'CALLED', 'SERVING');
create unique index service_queue_number_per_day on public.queues(service_id, queue_number, ((joined_at at time zone 'UTC')::date));
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  queue_id uuid references public.queues(id) on delete cascade, title text not null, message text not null,
  is_read boolean not null default false, external_delivery_status text not null default 'not_configured', external_sent_at timestamptz, created_at timestamptz not null default now()
);
create table public.queue_history (
  id uuid primary key default gen_random_uuid(), queue_id uuid not null references public.queues(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, service_id uuid not null references public.services(id) on delete restrict,
  queue_number text not null, status public.queue_status not null, waiting_time integer not null default 0,
  service_time integer not null default 0, created_at timestamptz not null default now()
);
create unique index queue_history_one_record_per_queue on public.queue_history(queue_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.users(id) on delete set null,
  action text not null check (char_length(action) between 2 and 100), target_type text not null check (char_length(target_type) between 2 and 80),
  target_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index audit_logs_actor_id_idx on public.audit_logs(actor_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.users (id, name, email) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and is_active and role in ('admin','staff'));
$$;
create or replace function public.join_queue(p_service_id uuid, p_user_id uuid)
returns public.queues language plpgsql security definer set search_path = public as $$
declare
  v_service public.services;
  v_count integer;
  v_queue public.queues;
begin
  if p_user_id <> auth.uid() then raise exception 'You may only create your own queue.' using errcode = '42501'; end if;
  select * into v_service from public.services where id = p_service_id and status = 'OPEN' for update;
  if not found then raise exception 'Service is unavailable.' using errcode = '22023'; end if;
  if exists (select 1 from public.queues where user_id = p_user_id and status in ('WAITING','CALLED','SERVING')) then
    raise exception 'You already have an active queue.' using errcode = '23505';
  end if;
  select count(*) into v_count from public.queues where service_id = p_service_id and joined_at >= date_trunc('day', now()) and status in ('WAITING','CALLED','SERVING');
  insert into public.queues (queue_number, user_id, service_id, estimated_wait_time)
  values (upper(left(v_service.name, 1)) || '-' || lpad((coalesce((select max(substring(queue_number from '[0-9]+$')::integer) from public.queues where service_id = p_service_id and joined_at >= date_trunc('day', now())), 0) + 1)::text, 3, '0'), p_user_id, p_service_id, v_count * v_service.average_service_time)
  returning * into v_queue;
  return v_queue;
end; $$;
alter table public.users enable row level security; alter table public.services enable row level security; alter table public.counters enable row level security;
alter table public.queues enable row level security; alter table public.notifications enable row level security; alter table public.queue_history enable row level security;
alter table public.audit_logs enable row level security;
create policy "users read own or staff" on public.users for select using (id = auth.uid() or public.is_staff());
create policy "services public read" on public.services for select using (true);
create policy "services staff write" on public.services for all using (public.is_staff()) with check (public.is_staff());
create policy "counters read" on public.counters for select using (true);
create policy "counters staff write" on public.counters for all using (public.is_staff()) with check (public.is_staff());
create policy "queues own or staff" on public.queues for select using (user_id = auth.uid() or public.is_staff());
create policy "queues customer insert" on public.queues for insert with check (user_id = auth.uid());
create policy "queues own cancel or staff" on public.queues for update using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy "notifications own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications update own" on public.notifications for update using (user_id = auth.uid());
create policy "history own or staff" on public.queue_history for select using (user_id = auth.uid() or public.is_staff());
create policy "audit logs admin read" on public.audit_logs for select using (exists (select 1 from public.users where id = auth.uid() and role = 'admin' and is_active));

insert into public.services (name, description, location, operating_hours, average_service_time) values
('Registrar''s Office', 'Student documents and records', 'Main Building', '8:00 AM - 5:00 PM', 5),
('Cashier', 'Payment and cashier services', 'Ground Floor', '8:00 AM - 4:00 PM', 4),
('Student Affairs', 'Student concerns and assistance', 'Student Center', '8:00 AM - 5:00 PM', 7)
on conflict do nothing;
