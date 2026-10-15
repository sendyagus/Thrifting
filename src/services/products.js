import { supabase, getPublicImageUrl } from '../lib/supabase'

function mapProduct(row) {
  if (!row) return null
  const images = (row.product_images || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({
      ...img,
      url: getPublicImageUrl(img.storage_path),
    }))

  return {
    ...row,
    category: row.categories || null,
    images,
    primaryImage: images[0]?.url || null,
  }
}

export async function fetchPublicProducts({ search = '', category = '', size = '', condition = '', minPrice = '', maxPrice = '', sort = 'newest', page = 1, pageSize = 12 } = {}) {
  let query = supabase
    .from('products')
    .select(
      `id, sku, name, description, brand, size_label, condition_label, condition_notes, selling_price, stock, created_at,
       categories ( id, name, slug ),
       product_images ( id, storage_path, sort_order )`,
      { count: 'exact' }
    )
    .eq('is_active', true)
    .gt('stock', 0)

  if (search) query = query.ilike('name', `%${search}%`)
  if (category) query = query.eq('categories.slug', category)
  if (size) query = query.eq('size_label', size)
  if (condition) query = query.eq('condition_label', condition)
  if (minPrice !== '' && minPrice != null) query = query.gte('selling_price', Number(minPrice))
  if (maxPrice !== '' && maxPrice != null) query = query.lte('selling_price', Number(maxPrice))

  if (sort === 'price_asc') query = query.order('selling_price', { ascending: true })
  else if (sort === 'price_desc') query = query.order('selling_price', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error

  // PostgREST filter on nested relation can leave unmatched category null — filter client-side if needed
  let rows = (data || []).map(mapProduct)
  if (category) {
    rows = rows.filter((p) => p.category?.slug === category)
  }

  return { products: rows, total: count || 0 }
}

export async function fetchPublicProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select(
      `id, sku, name, description, brand, size_label, condition_label, condition_notes, selling_price, stock, is_active, created_at,
       categories ( id, name, slug ),
       product_images ( id, storage_path, sort_order )`
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return mapProduct(data)
}

export async function fetchFeaturedProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(
      `id, sku, name, selling_price, stock, size_label, condition_label,
       categories ( id, name, slug ),
       product_images ( id, storage_path, sort_order )`
    )
    .eq('is_active', true)
    .gt('stock', 0)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(mapProduct)
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, created_at')
    .order('name')

  if (error) throw error
  return data || []
}

export async function fetchAdminProducts({ search = '', includeArchived = false } = {}) {
  let query = supabase
    .from('products')
    .select(
      `*,
       categories ( id, name, slug ),
       product_images ( id, storage_path, sort_order )`
    )
    .order('updated_at', { ascending: false })

  if (!includeArchived) query = query.eq('is_active', true)
  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapProduct)
}

export async function upsertCategory({ id, name, slug }) {
  const payload = { name, slug }
  if (id) payload.id = id

  const { data, error } = await supabase
    .from('categories')
    .upsert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createProduct(payload) {
  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProduct(id, payload) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveProduct(id) {
  return updateProduct(id, { is_active: false })
}

export async function uploadProductImage(productId, file, sortOrder = 0) {
  const ext = file.name.split('.').pop()
  const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: path,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error) throw error
  return { ...data, url: getPublicImageUrl(data.storage_path) }
}

export async function deleteProductImage(image) {
  if (image.storage_path) {
    await supabase.storage.from('product-images').remove([image.storage_path])
  }

  const { error } = await supabase.from('product_images').delete().eq('id', image.id)
  if (error) throw error
}

export async function reorderProductImages(images) {
  const updates = images.map((img, index) =>
    supabase.from('product_images').update({ sort_order: index }).eq('id', img.id)
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}
