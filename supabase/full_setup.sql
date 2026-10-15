-- ==========================================
-- FILE: supabase/migrations/001_schema.sql
-- ==========================================
-- ThriftLoop schema, RLS, storage, and RPC functions
-- Run in Supabase SQL Editor (or via supabase db push)

create extension if not exists "pgcrypto";

-- ========== ENUMS ==========
do $$ begin
  create type public.user_role as enum ('admin', 'cashier');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sale_status as enum ('completed', 'voided');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'transfer', 'qris');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stock_movement_type as enum ('restock', 'sale', 'adjustment', 'void_return');
exception when duplicate_object then null; end $$;

-- ========== TABLES ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'cashier',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  brand text,
  category_id uuid references public.categories(id) on delete set null,
  size_label text,
  condition_label text,
  condition_notes text,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(12,2) not null check (selling_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  cashier_id uuid not null references public.profiles(id),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_method public.payment_method not null,
  status public.sale_status not null default 'completed',
  notes text,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id),
  void_reason text
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  sku_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_cost_snapshot numeric(12,2) not null check (unit_cost_snapshot >= 0),
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  line_discount numeric(12,2) not null default 0 check (line_discount >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id),
  movement_type public.stock_movement_type not null,
  quantity_change integer not null,
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_active_stock on public.products (is_active, stock);
create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_name on public.products using gin (to_tsvector('simple', coalesce(name, '')));
create index if not exists idx_sales_created on public.sales (created_at desc);
create index if not exists idx_sale_items_sale on public.sale_items (sale_id);
create index if not exists idx_stock_movements_product on public.stock_movements (product_id, created_at desc);


-- ==========================================
-- FILE: supabase/migrations/002_rls_helpers.sql
-- ==========================================
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


-- ==========================================
-- FILE: supabase/migrations/003a_rpc_inventory.sql
-- ==========================================
-- Inventory RPCs

create or replace function public.restock_product(
  p_product_id uuid,
  p_quantity integer,
  p_notes text default null,
  p_unit_cost numeric default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat restok';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Jumlah restok harus lebih dari 0';
  end if;

  update public.products
  set
    stock = stock + p_quantity,
    cost_price = coalesce(p_unit_cost, cost_price),
    updated_at = now()
  where id = p_product_id and is_active = true
  returning * into v_product;

  if v_product.id is null then
    raise exception 'Produk tidak ditemukan';
  end if;

  insert into public.stock_movements (product_id, user_id, movement_type, quantity_change, notes)
  values (p_product_id, auth.uid(), 'restock', p_quantity, p_notes);

  return v_product;
end;
$$;

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_quantity_change integer,
  p_notes text
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat menyesuaikan stok';
  end if;
  if p_quantity_change = 0 then
    raise exception 'Perubahan stok tidak boleh 0';
  end if;
  if p_notes is null or length(trim(p_notes)) < 3 then
    raise exception 'Alasan penyesuaian wajib diisi';
  end if;

  update public.products
  set stock = stock + p_quantity_change, updated_at = now()
  where id = p_product_id and stock + p_quantity_change >= 0
  returning * into v_product;

  if v_product.id is null then
    raise exception 'Penyesuaian gagal. Cek produk dan pastikan stok tidak negatif.';
  end if;

  insert into public.stock_movements (product_id, user_id, movement_type, quantity_change, notes)
  values (p_product_id, auth.uid(), 'adjustment', p_quantity_change, p_notes);

  return v_product;
end;
$$;


-- ==========================================
-- FILE: supabase/migrations/003b_rpc_sale.sql
-- ==========================================
-- complete_sale RPC

create or replace function public.complete_sale(
  p_items jsonb,
  p_discount numeric default 0,
  p_payment_method public.payment_method default 'cash',
  p_notes text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
  v_item jsonb;
  v_product public.products;
  v_qty integer;
  v_line_discount numeric;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total numeric;
  v_receipt text;
begin
  if not public.is_staff() then
    raise exception 'Tidak diizinkan membuat transaksi';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;
  if coalesce(p_discount, 0) < 0 then
    raise exception 'Diskon tidak valid';
  end if;

  v_receipt := 'TL-' || to_char(now(), 'YYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;
    v_line_discount := coalesce((v_item->>'line_discount')::numeric, 0);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Kuantitas tidak valid';
    end if;

    select * into v_product from public.products
    where id = (v_item->>'product_id')::uuid and is_active = true
    for update;

    if v_product.id is null then raise exception 'Produk tidak ditemukan'; end if;
    if v_product.stock < v_qty then
      raise exception 'Stok tidak cukup untuk %', v_product.name;
    end if;

    v_line_total := (v_product.selling_price * v_qty) - v_line_discount;
    if v_line_total < 0 then raise exception 'Total baris tidak valid'; end if;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if p_discount > v_subtotal then raise exception 'Diskon melebihi subtotal'; end if;
  v_total := v_subtotal - coalesce(p_discount, 0);

  insert into public.sales (
    receipt_number, cashier_id, subtotal, discount, total, payment_method, status, notes
  ) values (
    v_receipt, auth.uid(), v_subtotal, coalesce(p_discount, 0), v_total,
    p_payment_method, 'completed', p_notes
  ) returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;
    v_line_discount := coalesce((v_item->>'line_discount')::numeric, 0);

    update public.products
    set stock = stock - v_qty, updated_at = now()
    where id = (v_item->>'product_id')::uuid and stock >= v_qty
    returning * into v_product;

    if v_product.id is null then
      raise exception 'Gagal mengurangi stok (kemungkinan stok berubah)';
    end if;

    v_line_total := (v_product.selling_price * v_qty) - v_line_discount;

    insert into public.sale_items (
      sale_id, product_id, product_name_snapshot, sku_snapshot, quantity,
      unit_cost_snapshot, unit_price_snapshot, line_discount, line_total
    ) values (
      v_sale.id, v_product.id, v_product.name, v_product.sku, v_qty,
      v_product.cost_price, v_product.selling_price, v_line_discount, v_line_total
    );

    insert into public.stock_movements (
      product_id, user_id, movement_type, quantity_change, reference_id, notes
    ) values (
      v_product.id, auth.uid(), 'sale', -v_qty, v_sale.id,
      'Penjualan ' || v_sale.receipt_number
    );
  end loop;

  return v_sale;
end;
$$;


-- ==========================================
-- FILE: supabase/migrations/003c_rpc_void.sql
-- ==========================================
-- void_sale RPC

create or replace function public.void_sale(
  p_sale_id uuid,
  p_reason text
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
  v_item public.sale_items;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat membatalkan transaksi';
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'Alasan pembatalan wajib diisi';
  end if;

  select * into v_sale from public.sales where id = p_sale_id for update;
  if v_sale.id is null then raise exception 'Transaksi tidak ditemukan'; end if;
  if v_sale.status = 'voided' then raise exception 'Transaksi sudah dibatalkan'; end if;

  for v_item in select * from public.sale_items where sale_id = p_sale_id
  loop
    if v_item.product_id is not null then
      update public.products
      set stock = stock + v_item.quantity, updated_at = now()
      where id = v_item.product_id;

      insert into public.stock_movements (
        product_id, user_id, movement_type, quantity_change, reference_id, notes
      ) values (
        v_item.product_id, auth.uid(), 'void_return', v_item.quantity, p_sale_id, p_reason
      );
    end if;
  end loop;

  update public.sales
  set status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;


-- ==========================================
-- FILE: supabase/migrations/004a_reports.sql
-- ==========================================
-- Dashboard and sales report RPCs

create or replace function public.get_dashboard_stats(
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := coalesce(p_from::timestamptz, date_trunc('month', now()));
  v_to timestamptz := coalesce((p_to + 1)::timestamptz, now() + interval '1 day');
  v_result jsonb;
begin
  if not public.is_staff() then raise exception 'Tidak diizinkan'; end if;

  select jsonb_build_object(
    'active_products', (select count(*) from products where is_active),
    'total_stock', (select coalesce(sum(stock),0) from products where is_active),
    'low_stock_count', (select count(*) from products where is_active and stock > 0 and stock <= 2),
    'sales_count', (
      select count(*) from sales
      where status = 'completed' and created_at >= v_from and created_at < v_to
    ),
    'revenue', (
      select coalesce(sum(total),0) from sales
      where status = 'completed' and created_at >= v_from and created_at < v_to
    ),
    'top_products', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select si.product_name_snapshot as name,
               sum(si.quantity) as qty_sold,
               sum(si.line_total) as revenue
        from sale_items si
        join sales s on s.id = si.sale_id
        where s.status = 'completed'
          and s.created_at >= v_from and s.created_at < v_to
        group by si.product_name_snapshot
        order by qty_sold desc limit 5
      ) t
    ),
    'low_stock_products', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select id, sku, name, stock from products
        where is_active and stock <= 2
        order by stock asc, name limit 10
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;


-- ==========================================
-- FILE: supabase/migrations/004b_reports_storage.sql
-- ==========================================
-- Sales report + storage + grants + seed

create or replace function public.get_sales_report(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz := p_from::timestamptz;
  v_to timestamptz := (p_to + 1)::timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat melihat laporan';
  end if;

  return (
    select jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'completed_count', count(*) filter (where status = 'completed'),
      'voided_count', count(*) filter (where status = 'voided'),
      'gross_before_discount',
        coalesce(sum(subtotal + discount) filter (where status = 'completed'), 0),
      'discount_total',
        coalesce(sum(discount) filter (where status = 'completed'), 0),
      'net_revenue',
        coalesce(sum(total) filter (where status = 'completed'), 0),
      'items_sold', (
        select coalesce(sum(si.quantity),0) from sale_items si
        join sales s2 on s2.id = si.sale_id
        where s2.status = 'completed'
          and s2.created_at >= v_from and s2.created_at < v_to
      ),
      'estimated_gross_profit', (
        select coalesce(sum(
          (si.unit_price_snapshot - si.unit_cost_snapshot) * si.quantity - si.line_discount
        ), 0)
        from sale_items si
        join sales s2 on s2.id = si.sale_id
        where s2.status = 'completed'
          and s2.created_at >= v_from and s2.created_at < v_to
      ),
      'inventory_summary', jsonb_build_object(
        'active_skus', (select count(*) from products where is_active),
        'units_on_hand', (select coalesce(sum(stock),0) from products where is_active),
        'inventory_cost_value', (select coalesce(sum(stock * cost_price),0) from products where is_active),
        'inventory_retail_value', (select coalesce(sum(stock * selling_price),0) from products where is_active)
      ),
      'by_payment', (
        select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
          select payment_method, count(*) as count, sum(total) as total
          from sales
          where status = 'completed'
            and created_at >= v_from and created_at < v_to
          group by payment_method
        ) t
      )
    )
    from sales
    where created_at >= v_from and created_at < v_to
  );
end;
$$;

grant execute on function public.is_staff() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.restock_product(uuid, integer, text, numeric) to authenticated;
grant execute on function public.adjust_stock(uuid, integer, text) to authenticated;
grant execute on function public.complete_sale(jsonb, numeric, public.payment_method, text) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;
grant execute on function public.get_dashboard_stats(date, date) to authenticated;
grant execute on function public.get_sales_report(date, date) to authenticated;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_public_select on storage.objects;
create policy product_images_public_select on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

insert into public.categories (name, slug) values
  ('Jaket', 'jaket'),
  ('Kemeja', 'kemeja'),
  ('Kaos', 'kaos'),
  ('Celana', 'celana'),
  ('Dress', 'dress'),
  ('Aksesoris', 'aksesoris')
on conflict (slug) do nothing;


-- ==========================================
-- FILE: supabase/bootstrap_admin.sql
-- ==========================================
-- Setelah membuat user di Supabase Auth, jadikan admin:
-- Ganti EMAIL dengan email staf admin pertama.

update public.profiles
set role = 'admin', is_active = true, full_name = coalesce(full_name, 'Administrator')
where id = (
  select id from auth.users where email = 'admin@thriftloop.local' limit 1
);


