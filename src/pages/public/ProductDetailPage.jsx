import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Spinner from '../../components/ui/Spinner'
import Alert from '../../components/ui/Alert'
import { formatCurrency } from '../../lib/format'
import { fetchPublicProductById } from '../../services/products'

export default function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const data = await fetchPublicProductById(id)
        if (!active) return
        setProduct(data)
        setActiveImage(0)
      } catch (err) {
        if (active) setError(err.message || 'Gagal memuat produk')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <div className="container"><Spinner /></div>
  if (error) return <div className="container py-10"><Alert type="error">{error}</Alert></div>
  if (!product) {
    return (
      <div className="container py-10">
        <Alert type="warning">Produk tidak ditemukan.</Alert>
        <Link to="/catalog" className="btn btn-secondary mt-4">Kembali ke katalog</Link>
      </div>
    )
  }

  const unavailable = !product.is_active || product.stock <= 0
  const images = product.images || []

  return (
    <div className="container py-10">
      <Link to="/catalog" className="text-sm font-semibold text-[var(--color-moss)]">← Kembali ke katalog</Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-[var(--color-sand)]">
            {images[activeImage]?.url ? (
              <img src={images[activeImage].url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--color-stone)]">Belum ada foto</div>
            )}
          </div>
          {images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, index) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl border ${index === activeImage ? 'border-[var(--color-forest)]' : 'border-[var(--color-line)]'}`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">{product.category?.name || 'Umum'}</span>
            <span className="badge">{product.size_label || '-'}</span>
            <span className="badge">{product.condition_label || '-'}</span>
            {unavailable ? <span className="badge badge-danger">Habis / tidak tersedia</span> : <span className="badge badge-ok">Tersedia</span>}
          </div>

          <h1 className="font-display text-4xl text-[var(--color-forest)]">{product.name}</h1>
          <p className="text-sm text-[var(--color-stone)]">SKU: {product.sku}</p>
          {product.brand ? <p className="text-sm">Brand: {product.brand}</p> : null}

          <p className="text-3xl font-semibold text-[var(--color-clay)]">{formatCurrency(product.selling_price)}</p>

          {product.description ? (
            <div>
              <h2 className="font-semibold text-[var(--color-forest)]">Deskripsi</h2>
              <p className="mt-1 whitespace-pre-wrap text-[var(--color-ink)]/85">{product.description}</p>
            </div>
          ) : null}

          {product.condition_notes ? (
            <div>
              <h2 className="font-semibold text-[var(--color-forest)]">Catatan kondisi</h2>
              <p className="mt-1 text-[var(--color-ink)]/85">{product.condition_notes}</p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-sand)] p-4 text-sm">
            Produk ini dapat dilihat di katalog untuk membantu perencanaan kunjungan. Pembelian dilakukan langsung di toko — tidak ada pemesanan online.
          </div>
        </div>
      </div>
    </div>
  )
}
