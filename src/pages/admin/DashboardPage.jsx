import { useEffect, useState } from 'react'
import Spinner from '../../components/ui/Spinner'
import Alert from '../../components/ui/Alert'
import { formatCurrency, formatDateInput } from '../../lib/format'
import { fetchDashboardStats } from '../../services/sales'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [from, setFrom] = useState(() => {
    const d = new Date()
    return formatDateInput(new Date(d.getFullYear(), d.getMonth(), 1))
  })
  const [to, setTo] = useState(formatDateInput())

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        setError('')
        const data = await fetchDashboardStats({ from, to })
        if (active) setStats(data)
      } catch (err) {
        if (active) setError(err.message || 'Gagal memuat dashboard')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [from, to])

  const cards = [
    { label: 'Produk aktif', value: stats?.active_products ?? '-' },
    { label: 'Total stok', value: stats?.total_stock ?? '-' },
    { label: 'Transaksi periode', value: stats?.sales_count ?? '-' },
    { label: 'Omzet periode', value: stats ? formatCurrency(stats.revenue) : '-' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-forest)]">Dashboard</h1>
          <p className="text-[var(--color-stone)]">Ringkasan operasional toko.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="field">
            <label htmlFor="from">Dari</label>
            <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="to">Sampai</label>
            <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="card-surface p-5">
                <p className="text-sm text-[var(--color-stone)]">{card.label}</p>
                <p className="mt-2 font-display text-3xl text-[var(--color-forest)]">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card-surface p-5">
              <h2 className="font-display text-xl">Produk terlaris</h2>
              <div className="mt-4 space-y-3">
                {(stats?.top_products || []).length === 0 ? (
                  <p className="text-sm text-[var(--color-stone)]">Belum ada data penjualan.</p>
                ) : (
                  stats.top_products.map((item) => (
                    <div key={item.name} className="flex items-center justify-between border-b border-[var(--color-line)] pb-2 text-sm">
                      <span>{item.name}</span>
                      <span className="font-semibold">{item.qty_sold} pcs · {formatCurrency(item.revenue)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card-surface p-5">
              <h2 className="font-display text-xl">Peringatan stok rendah</h2>
              <div className="mt-4 space-y-3">
                {(stats?.low_stock_products || []).length === 0 ? (
                  <p className="text-sm text-[var(--color-stone)]">Tidak ada peringatan stok.</p>
                ) : (
                  stats.low_stock_products.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b border-[var(--color-line)] pb-2 text-sm">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-[var(--color-stone)]">{item.sku}</p>
                      </div>
                      <span className={`badge ${item.stock === 0 ? 'badge-danger' : 'badge-warn'}`}>{item.stock} stok</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
