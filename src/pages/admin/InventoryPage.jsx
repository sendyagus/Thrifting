import { useEffect, useState } from 'react'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency, formatDate } from '../../lib/format'
import { adjustStock, fetchInventory, fetchStockMovements, restockProduct } from '../../services/inventory'

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [movements, setMovements] = useState([])
  const [search, setSearch] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [unitCost, setUnitCost] = useState('')
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState('restock')

  async function load() {
    try {
      setLoading(true)
      const [inv, mov] = await Promise.all([
        fetchInventory({ search, lowStockOnly: lowOnly }),
        fetchStockMovements({ limit: 40 }),
      ])
      setItems(inv)
      setMovements(mov)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, lowOnly])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      if (mode === 'restock') {
        await restockProduct({
          productId,
          quantity: Number(qty),
          notes,
          unitCost: unitCost === '' ? null : Number(unitCost),
        })
        setMessage('Restok berhasil')
      } else {
        await adjustStock({ productId, quantityChange: Number(qty), notes })
        setMessage('Penyesuaian stok berhasil')
      }
      setNotes('')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-[var(--color-forest)]">Inventaris</h1>
        <p className="text-[var(--color-stone)]">Restok, penyesuaian, dan riwayat pergerakan stok.</p>
      </div>
      {message ? <Alert type="success">{message}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input className="rounded-xl border border-[var(--color-line)] px-3 py-2" placeholder="Cari produk" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Stok rendah saja
            </label>
          </div>
          {loading ? <Spinner /> : (
            <div className="table-wrap card-surface">
              <table className="data">
                <thead><tr><th>Produk</th><th>Stok</th><th>Modal</th><th>Jual</th></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="cursor-pointer hover:bg-[var(--color-sand)]" onClick={() => setProductId(item.id)}>
                      <td>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-[var(--color-stone)]">{item.sku}</p>
                      </td>
                      <td><span className={`badge ${item.stock <= 2 ? 'badge-warn' : 'badge-ok'}`}>{item.stock}</span></td>
                      <td>{formatCurrency(item.cost_price)}</td>
                      <td>{formatCurrency(item.selling_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="card-surface space-y-3 p-5">
            <h2 className="font-display text-xl">Catat perubahan stok</h2>
            <div className="field">
              <label>Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="restock">Restok (+)</option>
                <option value="adjust">Penyesuaian (+/-)</option>
              </select>
            </div>
            <div className="field">
              <label>Produk</label>
              <select required value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Pilih produk</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>)}
              </select>
            </div>
            <div className="field">
              <label>{mode === 'restock' ? 'Jumlah restok' : 'Perubahan (bisa negatif)'}</label>
              <input type="number" required value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            {mode === 'restock' ? (
              <div className="field">
                <label>Harga modal baru (opsional)</label>
                <input type="number" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
              </div>
            ) : null}
            <div className="field">
              <label>Catatan / alasan</label>
              <textarea required rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary">Simpan</button>
          </form>
          <div className="card-surface p-5">
            <h2 className="font-display text-xl">Riwayat pergerakan</h2>
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
              {movements.map((m) => (
                <div key={m.id} className="border-b border-[var(--color-line)] pb-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">{m.products?.name}</p>
                    <span className={m.quantity_change >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                    </span>
                  </div>
                  <p className="text-[var(--color-stone)]">{m.movement_type} · {m.profiles?.full_name || '-'} · {formatDate(m.created_at)}</p>
                  {m.notes ? <p>{m.notes}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
