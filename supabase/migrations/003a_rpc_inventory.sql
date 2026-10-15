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
