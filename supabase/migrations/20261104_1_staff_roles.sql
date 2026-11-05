-- Add department-scoped staff roles; apply this migration before the department schema migration.
alter type public.user_role add value if not exists 'registrar';
alter type public.user_role add value if not exists 'finance';

