import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../../components/products/ProductCard'
import Spinner from '../../components/ui/Spinner'
import Alert from '../../components/ui/Alert'
import { fetchCategories, fetchFeaturedProducts } from '../../services/products'

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const [featured, cats] = await Promise.all([
          fetchFeaturedProducts(8),
          fetchCategories(),
        ])
        if (!active) return
        setProducts(featured)
        setCategories(cats)
      } catch (err) {
        if (active) setError(err.message || 'Gagal memuat beranda')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <section className="hero-grid text-white">
        <div className="container grid min-h-[78vh] items-end gap-8 py-16 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="fade-up space-y-5">
            <p className="font-display text-5xl font-bold leading-none md:text-7xl">ThriftLoop</p>
            <h1 className="max-w-xl text-2xl font-medium leading-snug md:text-3xl">
              Koleksi thrift pilihan, siap dijelajahi sebelum kamu datang ke toko.
            </h1>
            <p className="max-w-lg text-white/80">
              Lihat foto, ukuran, kondisi, dan harga secara real-time. Tanpa checkout online — belanja langsung di toko.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/catalog" className="btn bg-[var(--color-lime)] text-[var(--color-ink)]">
                Lihat katalog
              </Link>
              <Link to="/about" className="btn border border-white/40 text-white">
                Tentang toko
              </Link>
            </div>
          </div>
          <div className="fade-up hidden rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur md:block" style={{ animationDelay: '120ms' }}>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-lime)]">Kurasi mingguan</p>
            <p className="mt-4 font-display text-3xl">Vintage finds, ready to wear.</p>
            <p className="mt-3 text-sm text-white/75">
              Stok selalu sinkron dengan inventaris toko. Habis di rak, hilang dari katalog.
            </p>
          </div>
        </div>
      </section>

      <section className="container py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-[var(--color-forest)]">Kategori</h2>
            <p className="mt-1 text-[var(--color-stone)]">Mulai dari potongan favoritmu.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/catalog?category=${cat.slug}`}
              className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-5 text-center font-semibold text-[var(--color-forest)] transition hover:border-[var(--color-leaf)] hover:bg-[var(--color-sand)]"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[var(--color-sand)] py-14">
        <div className="container">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-[var(--color-forest)]">Produk terbaru</h2>
              <p className="mt-1 text-[var(--color-stone)]">Barang yang baru masuk rak.</p>
            </div>
            <Link to="/catalog" className="btn btn-secondary">
              Semua produk
            </Link>
          </div>

          {loading ? <Spinner /> : null}
          {error ? <Alert type="error">{error}</Alert> : null}
          {!loading && !error ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="container py-16">
        <div className="grid items-center gap-8 rounded-[2rem] bg-[var(--color-forest)] px-8 py-10 text-white md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl">Datang, coba, bawa pulang.</h2>
            <p className="mt-3 text-white/80">
              ThriftLoop membantu kamu merencanakan kunjungan. Fitur pemesanan online sengaja tidak disediakan agar pengalaman thrifting tetap di toko.
            </p>
          </div>
          <div className="md:text-right">
            <Link to="/catalog" className="btn bg-[var(--color-lime)] text-[var(--color-ink)]">
              Mulai eksplorasi
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
