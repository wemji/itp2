-- Add department scope and operational records without dropping existing data.
alter table public.users add column if not exists department text;
alter table public.services add column if not exists department text not null default 'registrar';
alter table public.queues add column if not exists processed_by uuid references public.users(id) on delete set null;

update public.users set department = case role::text when 'registrar' then 'registrar' when 'finance' then 'finance' else department end;
update public.services set department = case
  when name ilike '%cashier%' or name ilike '%finance%' or name ilike '%payment%' or name ilike '%bursar%' then 'finance'
  else 'registrar' end;

alter table public.users drop constraint if exists users_department_check;
alter table public.users add constraint users_department_check check (department is null or department in ('registrar','finance'));
alter table public.services drop constraint if exists services_department_check;
alter table public.services add constraint services_department_check check (department in ('registrar','finance'));

create table if not exists public.queue_status_history (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.queues(id) on delete cascade,
  from_status public.queue_status,
  to_status public.queue_status not null,
  changed_by uuid references public.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists queue_status_history_queue_changed_idx on public.queue_status_history(queue_id, changed_at desc);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null check (char_length(action) between 2 and 100),
  target_type text not null check (char_length(target_type) between 2 and 80),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_created_idx on public.activity_logs(created_at desc);
create index if not exists activity_logs_actor_created_idx on public.activity_logs(actor_id, created_at desc);
create index if not exists services_department_status_idx on public.services(department, status);

create or replace function public.record_queue_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.queue_status_history(queue_id, from_status, to_status) values (new.id, null, new.status);
  elsif old.status is distinct from new.status then
    insert into public.queue_status_history(queue_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, new.processed_by);
  end if;
  return new;
end; $$;
drop trigger if exists queue_status_history_trigger on public.queues;
create trigger queue_status_history_trigger after insert or update of status on public.queues
for each row execute function public.record_queue_status_change();

alter table public.queue_status_history enable row level security;
alter table public.activity_logs enable row level security;
create or replace function public.protect_customer_queue_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status and not (
    (old.status = 'WAITING' and new.status in ('CALLED','CANCELLED','NO-SHOW'))
    or (old.status = 'CALLED' and new.status in ('SERVING','WAITING','CANCELLED','NO-SHOW'))
    or (old.status = 'SERVING' and new.status = 'COMPLETED')
  ) then raise exception 'Invalid queue status transition.' using errcode = '23514'; end if;
  if auth.role() = 'service_role' then return new; end if;
  if old.user_id = auth.uid() then
    if old.status not in ('WAITING','CALLED') or new.status <> 'CANCELLED'
      or new.user_id is distinct from old.user_id or new.service_id is distinct from old.service_id
      or new.queue_number is distinct from old.queue_number or new.joined_at is distinct from old.joined_at
      or new.called_at is distinct from old.called_at or new.serving_at is distinct from old.serving_at
      or new.counter_id is distinct from old.counter_id or new.processed_by is distinct from old.processed_by
      or new.estimated_wait_time is distinct from old.estimated_wait_time then
      raise exception 'Customers may only cancel their own waiting or called queue.' using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists protect_customer_queue_update_trigger on public.queues;
create trigger protect_customer_queue_update_trigger before update on public.queues
for each row execute function public.protect_customer_queue_update();
drop policy if exists "queue status history own or staff" on public.queue_status_history;
create policy "queue status history own or staff" on public.queue_status_history for select
using (exists (select 1 from public.queues q where q.id = queue_id and (q.user_id = auth.uid() or public.is_staff())));
drop policy if exists "activity logs admin read" on public.activity_logs;
create policy "activity logs admin read" on public.activity_logs for select
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin' and u.is_active));

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and is_active and role in ('admin','staff','registrar','finance'));
$$;
create or replace function public.can_access_department(p_department text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.is_active and (u.role in ('admin','staff') or u.department = p_department));
$$;
create or replace function public.can_read_user(p_target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_target = auth.uid()
  or exists (select 1 from public.users me where me.id = auth.uid() and me.is_active and me.role in ('admin','staff'))
  or exists (
    select 1 from public.users me join public.queues q on q.user_id = p_target join public.services s on s.id = q.service_id
    where me.id = auth.uid() and me.is_active and me.department = s.department
  );
$$;

-- Keep the existing admin/staff policy working and give department roles access
-- only to services and queues assigned to their department.
drop policy if exists "services public read" on public.services;
create policy "services public read" on public.services for select using (true);
drop policy if exists "services staff write" on public.services;
create policy "services staff write" on public.services for all
using (public.can_access_department(department)) with check (public.can_access_department(department));
drop policy if exists "users read own or staff" on public.users;
create policy "users read own or assigned transactions" on public.users for select using (public.can_read_user(id));
drop policy if exists "counters read" on public.counters;
create policy "counters read" on public.counters for select using (exists (select 1 from public.services s where s.id = service_id and public.can_access_department(s.department)));
drop policy if exists "counters staff write" on public.counters;
create policy "counters staff write" on public.counters for all
using (exists (select 1 from public.services s where s.id = service_id and public.can_access_department(s.department)))
with check (exists (select 1 from public.services s where s.id = service_id and public.can_access_department(s.department)));
drop policy if exists "queues own or staff" on public.queues;
create policy "queues own or staff" on public.queues for select using (
  user_id = auth.uid() or exists (
    select 1 from public.users u join public.services s on s.id = service_id
    where u.id = auth.uid() and u.is_active and (u.role in ('admin','staff') or u.department = s.department)
  )
);
drop policy if exists "queues customer insert" on public.queues;
drop policy if exists "queues own cancel or staff" on public.queues;
create policy "department staff update queues" on public.queues for update using (
  exists (
    select 1 from public.users u join public.services s on s.id = service_id
    where u.id = auth.uid() and u.is_active and (u.role in ('admin','staff') or u.department = s.department)
  )
) with check (
  exists (
    select 1 from public.users u join public.services s on s.id = service_id
    where u.id = auth.uid() and u.is_active and (u.role in ('admin','staff') or u.department = s.department)
  )
);
drop policy if exists "history own or staff" on public.queue_history;
create policy "history own or department staff" on public.queue_history for select using (
  user_id = auth.uid() or exists (select 1 from public.users u join public.services s on s.id = service_id
    where u.id = auth.uid() and u.is_active and (u.role in ('admin','staff') or u.department = s.department))
);

-- Make independent queue numbers explicit and allocate within the service's
-- department prefix; the existing per-service unique index remains in force.
create or replace function public.join_queue(p_service_id uuid, p_user_id uuid)
returns public.queues language plpgsql security definer set search_path = public as $$
declare v_service public.services; v_count integer; v_queue public.queues; v_prefix text;
begin
  if p_user_id <> auth.uid() then raise exception 'You may only create your own queue.' using errcode = '42501'; end if;
  if not exists (select 1 from public.users where id = p_user_id and is_active and role = 'customer') then raise exception 'Customer access required.' using errcode = '42501'; end if;
  select * into v_service from public.services where id = p_service_id and status = 'OPEN' for update;
  if not found then raise exception 'Service is unavailable.' using errcode = '22023'; end if;
  if exists (select 1 from public.queues where user_id = p_user_id and status in ('WAITING','CALLED','SERVING')) then
    raise exception 'You already have an active queue.' using errcode = '23505';
  end if;
  select count(*) into v_count from public.queues where service_id = p_service_id and joined_at >= date_trunc('day', now()) and status in ('WAITING','CALLED','SERVING');
  v_prefix := case v_service.department when 'finance' then 'F' else 'R' end;
  insert into public.queues (queue_number, user_id, service_id, estimated_wait_time)
  values (v_prefix || '-' || lpad((coalesce((select max(substring(queue_number from '[0-9]+$')::integer) from public.queues where service_id = p_service_id and joined_at >= date_trunc('day', now())), 0) + 1)::text, 3, '0'), p_user_id, p_service_id, v_count * v_service.average_service_time)
  returning * into v_queue;
  return v_queue;
end; $$;

-- Enable Supabase change feeds used by the browser queue screens (safe if absent).
do $$ begin alter publication supabase_realtime add table public.queues; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; when undefined_object then null; end $$;

create or replace function public.call_next_queue(p_staff_id uuid)
returns public.queues language plpgsql security definer set search_path = public as $$
declare v_staff public.users; v_queue public.queues;
begin
  if auth.role() <> 'service_role' and p_staff_id <> auth.uid() then raise exception 'You may only call a queue for yourself.' using errcode = '42501'; end if;
  select * into v_staff from public.users where id = p_staff_id and is_active and role in ('admin','staff','registrar','finance');
  if not found then raise exception 'Active staff access required.' using errcode = '42501'; end if;
  select q.* into v_queue from public.queues q join public.services s on s.id = q.service_id
  where q.status = 'WAITING' and (v_staff.role in ('admin','staff') or s.department = v_staff.department)
  order by q.joined_at asc limit 1 for update of q skip locked;
  if not found then return null; end if;
  update public.queues set status = 'CALLED', called_at = now(), processed_by = p_staff_id where id = v_queue.id returning * into v_queue;
  return v_queue;
end; $$;
