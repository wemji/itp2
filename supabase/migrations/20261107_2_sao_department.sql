-- Make SAO a department alongside Registrar and Finance. Requires 20261107_1_sao_role.sql.
alter table public.users drop constraint if exists users_department_check;
alter table public.users add constraint users_department_check check (department is null or department in ('registrar','finance','sao'));
alter table public.services drop constraint if exists services_department_check;
alter table public.services add constraint services_department_check check (department in ('registrar','finance','sao'));

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and is_active and role in ('admin','staff','registrar','finance','sao'));
$$;

-- SAO tickets use the S- prefix.
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
  v_prefix := case v_service.department when 'finance' then 'F' when 'sao' then 'S' else 'R' end;
  insert into public.queues (queue_number, user_id, service_id, estimated_wait_time)
  values (v_prefix || '-' || lpad((coalesce((select max(substring(queue_number from '[0-9]+$')::integer) from public.queues where service_id = p_service_id and joined_at >= date_trunc('day', now())), 0) + 1)::text, 3, '0'), p_user_id, p_service_id, v_count * v_service.average_service_time)
  returning * into v_queue;
  return v_queue;
end; $$;

create or replace function public.call_next_queue(p_staff_id uuid)
returns public.queues language plpgsql security definer set search_path = public as $$
declare v_staff public.users; v_queue public.queues;
begin
  if auth.role() <> 'service_role' and p_staff_id <> auth.uid() then raise exception 'You may only call a queue for yourself.' using errcode = '42501'; end if;
  select * into v_staff from public.users where id = p_staff_id and is_active and role in ('admin','staff','registrar','finance','sao');
  if not found then raise exception 'Active staff access required.' using errcode = '42501'; end if;
  select q.* into v_queue from public.queues q join public.services s on s.id = q.service_id
  where q.status = 'WAITING' and (v_staff.role in ('admin','staff') or s.department = v_staff.department)
  order by q.joined_at asc limit 1 for update of q skip locked;
  if not found then return null; end if;
  update public.queues set status = 'CALLED', called_at = now(), processed_by = p_staff_id where id = v_queue.id returning * into v_queue;
  return v_queue;
end; $$;

-- create or replace keeps grants, but re-assert the service-role-only lock to be safe.
revoke execute on function public.join_queue(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.call_next_queue(uuid) from public, anon, authenticated;
grant execute on function public.join_queue(uuid, uuid) to service_role;
grant execute on function public.call_next_queue(uuid) to service_role;
