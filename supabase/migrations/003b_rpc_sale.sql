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
