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
