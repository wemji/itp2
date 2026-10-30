-- Query indexes for ONEQUEUE's live queue, history, and notification screens.
-- Safe to run more than once in the Supabase SQL Editor.

create index if not exists queues_service_status_joined_idx
  on public.queues(service_id, status, joined_at);

create index if not exists queues_status_joined_idx
  on public.queues(status, joined_at);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists queue_history_user_created_idx
  on public.queue_history(user_id, created_at desc);

create index if not exists queue_history_status_created_idx
  on public.queue_history(status, created_at desc);
