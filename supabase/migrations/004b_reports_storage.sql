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
