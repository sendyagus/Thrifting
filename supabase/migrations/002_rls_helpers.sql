-- Helper functions + RLS policies

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'cashier')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'cashier',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;

-- profiles
drop policy if exists profiles_select_self_or_staff on public.profiles;
create policy profiles_select_self_or_staff on public.profiles
  for select using (auth.uid() = id or public.is_staff());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());

-- categories: public read, admin write
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (true);

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all using (public.is_admin())
  with check (public.is_admin());

-- products: public can only see active in-stock fields via restricted view pattern
-- Direct table: staff see all; public select limited by policy
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (
    (is_active = true and stock > 0)
    or public.is_staff()
  );

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin())
  with check (public.is_admin());

-- Hide cost_price from anon via column privilege revoke
revoke select on public.products from anon;
grant select (
  id, sku, name, description, brand, category_id, size_label, condition_label,
  condition_notes, selling_price, stock, is_active, created_at, updated_at
) on public.products to anon;
grant select on public.products to authenticated;

-- product_images
drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and ((p.is_active and p.stock > 0) or public.is_staff())
    )
  );

drop policy if exists product_images_admin_write on public.product_images;
create policy product_images_admin_write on public.product_images
  for all using (public.is_admin())
  with check (public.is_admin());

-- sales / sale_items / stock_movements: staff only
drop policy if exists sales_staff_read on public.sales;
create policy sales_staff_read on public.sales
  for select using (public.is_staff());

drop policy if exists sale_items_staff_read on public.sale_items;
create policy sale_items_staff_read on public.sale_items
  for select using (public.is_staff());

drop policy if exists stock_movements_staff_read on public.stock_movements;
create policy stock_movements_staff_read on public.stock_movements
  for select using (public.is_staff());

-- Direct inserts to sales tables blocked; use RPC only
revoke insert, update, delete on public.sales from authenticated, anon;
revoke insert, update, delete on public.sale_items from authenticated, anon;
revoke insert, update, delete on public.stock_movements from authenticated, anon;
