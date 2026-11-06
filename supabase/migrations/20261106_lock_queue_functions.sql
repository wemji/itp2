-- Only the ONEQUEUE server (service_role key) may run the queue functions.
-- Before this, anon/authenticated clients could call them over the REST API: for an anonymous
-- caller auth.uid() is NULL, so `p_user_id <> auth.uid()` evaluated to NULL and the ownership
-- check was skipped, letting anyone join a queue as another customer or call the next ticket
-- as any staff member.
revoke execute on function public.join_queue(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.call_next_queue(uuid) from public, anon, authenticated;
grant execute on function public.join_queue(uuid, uuid) to service_role;
grant execute on function public.call_next_queue(uuid) to service_role;
