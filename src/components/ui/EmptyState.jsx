export default function EmptyState({ title, description, action }) {
  return (
    <div className="card-surface px-6 py-12 text-center">
      <h3 className="font-display text-xl text-[var(--color-forest)]">{title}</h3>
      {description ? <p className="mt-2 text-[var(--color-stone)]">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
