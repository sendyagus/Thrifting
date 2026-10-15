import { supabase } from '../lib/supabase'

export async function searchPosProducts(term) {
  let query = supabase
    .from('products')
    .select('id, sku, name, selling_price, cost_price, stock, size_label, is_active')
    .eq('is_active', true)
    .gt('stock', 0)
    .order('name')
    .limit(20)

  if (term) {
    query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function completeSale({ items, discount = 0, paymentMethod, notes = null }) {
  const payload = {
    p_items: items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      line_discount: item.line_discount || 0,
    })),
    p_discount: discount,
    p_payment_method: paymentMethod,
    p_notes: notes,
  }

  const { data, error } = await supabase.rpc('complete_sale', payload)
  if (error) throw error
  return data
}

export async function voidSale({ saleId, reason }) {
  const { data, error } = await supabase.rpc('void_sale', {
    p_sale_id: saleId,
    p_reason: reason,
  })

  if (error) throw error
  return data
}

export async function fetchSales({ status = '', from = '', to = '', limit = 100 } = {}) {
  let query = supabase
    .from('sales')
    .select(
      `id, receipt_number, subtotal, discount, total, payment_method, status, created_at, voided_at, void_reason,
       cashier:profiles!sales_cashier_id_fkey ( id, full_name ),
       sale_items (
         id, product_id, product_name_snapshot, sku_snapshot, quantity,
         unit_cost_snapshot, unit_price_snapshot, line_discount, line_total
       )`
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (from) query = query.gte('created_at', `${from}T00:00:00`)
  if (to) query = query.lte('created_at', `${to}T23:59:59`)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchSaleById(id) {
  const { data, error } = await supabase
    .from('sales')
    .select(
      `*,
       cashier:profiles!sales_cashier_id_fkey ( id, full_name ),
       voided_by_profile:profiles!sales_voided_by_fkey ( id, full_name ),
       sale_items (*)`
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchDashboardStats({ from, to }) {
  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_from: from || null,
    p_to: to || null,
  })

  if (error) throw error
  return data
}

export async function fetchSalesReport({ from, to }) {
  const { data, error } = await supabase.rpc('get_sales_report', {
    p_from: from,
    p_to: to,
  })

  if (error) throw error
  return data
}

export function salesToCsv(sales) {
  const header = [
    'receipt_number',
    'created_at',
    'cashier',
    'status',
    'payment_method',
    'subtotal',
    'discount',
    'total',
  ]

  const rows = sales.map((sale) => [
    sale.receipt_number,
    sale.created_at,
    sale.cashier?.full_name || '',
    sale.status,
    sale.payment_method,
    sale.subtotal,
    sale.discount,
    sale.total,
  ])

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
