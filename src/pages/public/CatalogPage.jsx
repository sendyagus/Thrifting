import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../../components/products/ProductCard'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Alert from '../../components/ui/Alert'
import { CONDITION_OPTIONS, SIZE_OPTIONS, SORT_OPTIONS } from '../../lib/constants'
import { fetchCategories, fetchPublicProducts } from '../../services/products'

const PAGE_SIZE = 12

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const filters = useMemo(
    () => ({
      search: searchParams.get('q') || '',
      category: searchParams.get('category') || '',
      size: searchParams.get('size') || '',
      condition: searchParams.get('condition') || '',
      minPrice: searchParams.get('min') || '',
      maxPrice: searchParams.get('max') || '',
      sort: searchParams.get('sort') || 'newest',
      page: Number(searchParams.get('page') || 1),
    }),
    [searchParams]
  )

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams)
    if (!value) next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        setError('')
        const result = await fetchPublicProducts({ ...filters, pageSize: PAGE_SIZE })
        if (!active) return
        setProducts(result.products)
        setTotal(result.total)
      } catch (err) {
        if (active) setError(err.message || 'Gagal memuat katalog')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [filters])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-[var(--color-forest)]">Katalog</h1>
        <p className="mt-2 text-[var(--color-stone)]">Cari, filter, dan temukan pakaian thrift yang tersedia.</p>
      </div>

      <div className="mb-8 grid gap-3 rounded-2xl border border-[var(--color-line)] bg-white p-4 md:grid-cols-4 lg:grid-cols-8">
        <div className="field md:col-span-2">
          <label htmlFor="q">Cari</label>
          <input id="q" value={filters.search} onChange={(e) => updateFilter('q', e.target.value)} placeholder="Nama produk" />
        </div>
        <div className="field">
          <label htmlFor="category">Kategori</label>
          <select id="category" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
            <option value="">Semua</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="size">Ukuran</label>
          <select id="size" value={filters.size} onChange={(e) => updateFilter('size', e.target.value)}>
            <option value="">Semua</option>
            {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="condition">Kondisi</label>
          <select id="condition" value={filters.condition} onChange={(e) => updateFilter('condition', e.target.value)}>
            <option value="">Semua</option>
            {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="min">Harga min</label>
          <input id="min" type="number" min="0" value={filters.minPrice} onChange={(e) => updateFilter('min', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="max">Harga max</label>
          <input id="max" type="number" min="0" value={filters.maxPrice} onChange={(e) => updateFilter('max', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sort">Urutkan</label>
          <select id="sort" value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? <Spinner /> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      {!loading && !error && products.length === 0 ? (
        <EmptyState title="Tidak ada produk" description="Coba ubah filter atau kata kunci pencarian." />
      ) : null}

      {!loading && !error && products.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-[var(--color-stone)]">{total} produk ditemukan</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          <div className="mt-8 flex items-center justify-center gap-3">
            <button type="button" className="btn btn-secondary" disabled={filters.page <= 1} onClick={() => updateFilter('page', String(filters.page - 1))}>Sebelumnya</button>
            <span className="text-sm">Halaman {filters.page} / {totalPages}</span>
            <button type="button" className="btn btn-secondary" disabled={filters.page >= totalPages} onClick={() => updateFilter('page', String(filters.page + 1))}>Berikutnya</button>
          </div>
        </>
      ) : null}
    </div>
  )
}
