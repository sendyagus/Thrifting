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
