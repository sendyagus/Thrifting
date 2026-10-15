-- Setelah membuat user di Supabase Auth, jadikan admin:
-- Ganti EMAIL dengan email staf admin pertama.

update public.profiles
set role = 'admin', is_active = true, full_name = coalesce(full_name, 'Administrator')
where id = (
  select id from auth.users where email = 'admin@thriftloop.local' limit 1
);
