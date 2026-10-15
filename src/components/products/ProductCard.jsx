import { Link } from 'react-router-dom'
import { formatCurrency } from '../../lib/format'

export default function ProductCard({ product }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="group overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(20,36,28,0.08)]"
    >
      <div className="aspect-[4/5] overflow-hidden bg-[var(--color-sand)]">
        {product.primaryImage ? (
          <img
            src={product.primaryImage}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-stone)]">
            Belum ada foto
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight text-[var(--color-forest)]">{product.name}</h3>
          <span className="badge">{product.size_label || '-'}</span>
        </div>
        <p className="text-sm text-[var(--color-stone)]">
          {product.category?.name || 'Umum'} · {product.condition_label || 'Good'}
        </p>
        <p className="font-semibold text-[var(--color-clay)]">{formatCurrency(product.selling_price)}</p>
      </div>
    </Link>
  )
}
