-- Security hardening: administrative audit trail.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null check (char_length(action) between 2 and 100),
  target_type text not null check (char_length(target_type) between 2 and 80),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);

alter table public.audit_logs enable row level security;
drop policy if exists "audit logs admin read" on public.audit_logs;
create policy "audit logs admin read" on public.audit_logs for select using (
  exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and is_active
  )
);
