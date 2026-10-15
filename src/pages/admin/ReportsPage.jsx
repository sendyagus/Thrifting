import { useEffect, useState } from 'react'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency, formatDateInput } from '../../lib/format'
import { fetchSales, fetchSalesReport, salesToCsv } from '../../services/sales'

export default function ReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    return formatDateInput(new Date(d.getFullYear(), d.getMonth(), 1))
  })
  const [to, setTo] = useState(formatDateInput())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        setError('')
        const data = await fetchSalesReport({ from, to })
        if (active) setReport(data)
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [from, to])

  async function exportCsv() {
    try {
      const sales = await fetchSales({ from, to, status: 'completed', limit: 1000 })
      const csv = salesToCsv(sales)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `thriftloop-sales-${from}-${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-forest)]">Laporan</h1>
          <p className="text-[var(--color-stone)]">Penjualan, diskon, dan estimasi laba kotor.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="field"><label>Dari</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="field"><label>Sampai</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <button type="button" className="btn btn-secondary" onClick={exportCsv}>Ekspor CSV</button>
        </div>
      </div>

      {loading ? <Spinner /> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      {!loading && report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Transaksi selesai" value={report.completed_count} />
            <Stat label="Dibatalkan" value={report.voided_count} />
            <Stat label="Omzet bersih" value={formatCurrency(report.net_revenue)} />
            <Stat label="Estimasi laba kotor" value={formatCurrency(report.estimated_gross_profit)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card-surface space-y-2 p-5 text-sm">
              <h2 className="font-display text-xl">Ringkasan penjualan</h2>
              <Row label="Nilai sebelum diskon" value={formatCurrency(report.gross_before_discount)} />
              <Row label="Total diskon" value={formatCurrency(report.discount_total)} />
              <Row label="Pendapatan setelah diskon" value={formatCurrency(report.net_revenue)} />
              <Row label="Barang terjual" value={report.items_sold} />
            </div>
            <div className="card-surface space-y-2 p-5 text-sm">
              <h2 className="font-display text-xl">Ringkasan inventaris</h2>
              <Row label="SKU aktif" value={report.inventory_summary?.active_skus} />
              <Row label="Unit on hand" value={report.inventory_summary?.units_on_hand} />
              <Row label="Nilai modal stok" value={formatCurrency(report.inventory_summary?.inventory_cost_value)} />
              <Row label="Nilai jual stok" value={formatCurrency(report.inventory_summary?.inventory_retail_value)} />
            </div>
          </div>

          <div className="card-surface p-5">
            <h2 className="font-display text-xl">Per metode pembayaran</h2>
            <div className="mt-3 space-y-2">
              {(report.by_payment || []).length === 0 ? (
                <p className="text-sm text-[var(--color-stone)]">Tidak ada data.</p>
              ) : (
                report.by_payment.map((row) => (
                  <div key={row.payment_method} className="flex justify-between border-b border-[var(--color-line)] py-2 text-sm">
                    <span>{row.payment_method}</span>
                    <span>{row.count} trx · {formatCurrency(row.total)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card-surface p-5">
      <p className="text-sm text-[var(--color-stone)]">{label}</p>
      <p className="mt-2 font-display text-2xl text-[var(--color-forest)]">{value}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-[var(--color-line)] py-2">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
