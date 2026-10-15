export default function Alert({ type = 'info', children }) {
  const styles = {
    info: 'bg-[#eef5ff] text-[#1d4f91] border-[#c9dcff]',
    error: 'bg-[#fde2e2] text-[#8b2e2e] border-[#f5c2c2]',
    success: 'bg-[#dff3e4] text-[#1d5c35] border-[#b9e0c3]',
    warning: 'bg-[#fff1d6] text-[#8a5a00] border-[#ffe0a3]',
  }

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[type] || styles.info}`}>
      {children}
    </div>
  )
}
