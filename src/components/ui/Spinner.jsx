export default function Spinner({ label = 'Memuat...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-[var(--color-forest)]" role="status">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-leaf)] border-t-transparent" />
      <span>{label}</span>
    </div>
  )
}
