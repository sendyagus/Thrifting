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
