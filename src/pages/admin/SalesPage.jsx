import { useEffect, useState } from 'react'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatDate, formatDateInput } from '../../lib/format'
import { fetchSales, voidSale } from '../../services/sales'

export default function SalesPage() {
  const { isAdmin } = useAuth()
  const [sales, setSales] = useState([])
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState(() => formatDateInput(new Date(Date.now() - 30 * 86400000)))
  const [to, setTo] = useState(formatDateInput())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState(null)

  async function load() {
    try {
      setLoading(true)
      setError('')
      const rows = await fetchSales({ status, from, to })
      setSales(rows)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [status, from, to])

  async function handleVoid(sale) {
    const reason = window.prompt('Alasan pembatalan:')
    if (!reason || reason.trim().length < 3) return
    try {
      await voidSale({ saleId: sale.id, reason: reason.trim() })
      setMessage(`Transaksi ${sale.receipt_number} dibatalkan`)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-[var(--color-forest)]">Riwayat penjualan</h1>
        <p className="text-[var(--color-stone)]">Daftar transaksi, detail item, dan pembatalan.</p>
      </div>
      {message ? <Alert type="success">{message}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="flex flex-wrap gap-3">
        <div className="field"><label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua</option>
            <option value="completed">Selesai</option>
            <option value="voided">Dibatalkan</option>
          </select>
        </div>
        <div className="field"><label>Dari</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="field"><label>Sampai</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div key={sale.id} className="card-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{sale.receipt_number}</p>
                  <p className="text-sm text-[var(--color-stone)]">{formatDate(sale.created_at)} · {sale.cashier?.full_name || '-'} · {sale.payment_method}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(sale.total)}</p>
                  <span className={`badge ${sale.status === 'completed' ? 'badge-ok' : 'badge-danger'}`}>{sale.status}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary text-sm" onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}>
                  {expanded === sale.id ? 'Sembunyikan' : 'Detail'}
                </button>
                {isAdmin && sale.status === 'completed' ? (
                  <button type="button" className="btn btn-danger text-sm" onClick={() => handleVoid(sale)}>Batalkan</button>
                ) : null}
              </div>
              {expanded === sale.id ? (
                <div className="mt-3 rounded-xl bg-[var(--color-sand)] p-3 text-sm">
                  <p>Subtotal {formatCurrency(sale.subtotal)} · Diskon {formatCurrency(sale.discount)}</p>
                  {sale.void_reason ? <p className="mt-1">Alasan void: {sale.void_reason}</p> : null}
                  <ul className="mt-2 space-y-1">
                    {(sale.sale_items || []).map((item) => (
                      <li key={item.id}>{item.quantity}x {item.product_name_snapshot} ({item.sku_snapshot}) — {formatCurrency(item.line_total)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
