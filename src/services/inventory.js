import { supabase } from '../lib/supabase'

export async function fetchInventory({ search = '', lowStockOnly = false, threshold = 2 } = {}) {
  let query = supabase
    .from('products')
    .select(
      `id, sku, name, stock, cost_price, selling_price, is_active, size_label,
       categories ( name )`
    )
    .eq('is_active', true)
    .order('stock', { ascending: true })

  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  if (lowStockOnly) query = query.lte('stock', threshold)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchStockMovements({ productId = null, limit = 50 } = {}) {
  let query = supabase
    .from('stock_movements')
    .select(
      `id, product_id, movement_type, quantity_change, notes, created_at, reference_id,
       products ( id, name, sku ),
       profiles:user_id ( full_name )`
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (productId) query = query.eq('product_id', productId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function restockProduct({ productId, quantity, notes = '', unitCost = null }) {
  const { data, error } = await supabase.rpc('restock_product', {
    p_product_id: productId,
    p_quantity: quantity,
    p_notes: notes,
    p_unit_cost: unitCost,
  })

  if (error) throw error
  return data
}

export async function adjustStock({ productId, quantityChange, notes }) {
  const { data, error } = await supabase.rpc('adjust_stock', {
    p_product_id: productId,
    p_quantity_change: quantityChange,
    p_notes: notes,
  })

  if (error) throw error
  return data
}
