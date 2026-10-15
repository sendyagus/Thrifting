import { useEffect, useMemo, useState } from 'react'
import Alert from '../../components/ui/Alert'
import { PAYMENT_METHODS } from '../../lib/constants'
import { formatCurrency } from '../../lib/format'
import { completeSale, searchPosProducts } from '../../services/sales'

export default function POSPage() {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const rows = await searchPosProducts(term)
        setResults(rows)
      } catch (err) {
        setError(err.message)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [term])

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0),
    [cart]
  )
  const total = Math.max(0, subtotal - Number(discount || 0))

  function addToCart(product) {
    setReceipt(null)
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          selling_price: Number(product.selling_price),
          stock: product.stock,
          quantity: 1,
          line_discount: 0,
        },
      ]
    })
  }

  function updateQty(productId, quantity) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: Math.max(1, Math.min(item.stock, Number(quantity) || 1)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((item) => item.product_id !== productId))
  }

  async function handleCheckout() {
    setError('')
    setSubmitting(true)
    try {
      const sale = await completeSale({
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          line_discount: item.line_discount || 0,
        })),
        discount: Number(discount) || 0,
        paymentMethod,
      })
      setReceipt({ ...sale, items: cart, paidTotal: total })
      setCart([])
      setDiscount(0)
      setTerm('')
      const rows = await searchPosProducts('')
      setResults(rows)
    } catch (err) {
      setError(err.message || 'Transaksi gagal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-[var(--color-forest)]">Kasir / POS</h1>
        <p className="text-[var(--color-stone)]">Catat penjualan langsung di toko.</p>
      </div>

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card-surface p-5">
          <div className="field">
            <label htmlFor="pos-search">Cari produk (nama / SKU)</label>
            <input id="pos-search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Ketik untuk mencari" autoFocus />
          </div>
          <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
            {results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--color-line)] px-3 py-3 text-left hover:bg-[var(--color-sand)]"
              >
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs text-[var(--color-stone)]">{product.sku} · stok {product.stock}</p>
                </div>
                <span className="font-semibold text-[var(--color-clay)]">{formatCurrency(product.selling_price)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card-surface space-y-4 p-5">
          <h2 className="font-display text-xl">Keranjang kasir</h2>
          {cart.length === 0 ? (
            <p className="text-sm text-[var(--color-stone)]">Belum ada item.</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product_id} className="rounded-xl border border-[var(--color-line)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-[var(--color-stone)]">{item.sku}</p>
                    </div>
                    <button type="button" className="text-sm text-[var(--color-clay)]" onClick={() => removeItem(item.product_id)}>Hapus</button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.quantity}
                      onChange={(e) => updateQty(item.product_id, e.target.value)}
                      className="w-20 rounded-lg border border-[var(--color-line)] px-2 py-1"
                    />
                    <span className="font-semibold">{formatCurrency(item.selling_price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t border-[var(--color-line)] pt-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="field">
              <label>Diskon</label>
              <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="field">
              <label>Metode pembayaran</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>

          <button type="button" className="btn btn-primary w-full" disabled={!cart.length || submitting} onClick={handleCheckout}>
            {submitting ? 'Memproses...' : 'Selesaikan transaksi'}
          </button>

          {receipt ? (
            <div className="rounded-2xl bg-[var(--color-sand)] p-4 text-sm">
              <p className="font-display text-lg text-[var(--color-forest)]">Struk {receipt.receipt_number}</p>
              <p className="mt-1">Total dibayar: {formatCurrency(receipt.total ?? receipt.paidTotal)}</p>
              <p>Metode: {receipt.payment_method}</p>
              <ul className="mt-3 space-y-1">
                {(receipt.items || []).map((item) => (
                  <li key={item.product_id}>{item.quantity}x {item.name}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
