import { Link } from 'react-router-dom'

export default function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-line)] bg-[var(--color-forest)] text-[var(--color-sand)]">
      <div className="container grid gap-8 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-bold">ThriftLoop</p>
          <p className="mt-3 max-w-sm text-sm opacity-85">
            Katalog digital dan sistem operasional untuk toko thrift. Temukan pakaian unik, datang langsung ke toko.
          </p>
        </div>
        <div>
          <p className="font-semibold">Jelajahi</p>
          <div className="mt-3 flex flex-col gap-2 text-sm opacity-90">
            <Link to="/catalog">Katalog</Link>
            <Link to="/about">Tentang toko</Link>
            <Link to="/admin/login">Area staf</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold">Kunjungi</p>
          <p className="mt-3 text-sm opacity-90">
            Senin–Sabtu · 10.00–20.00
            <br />
            Alamat toko dapat diperbarui di halaman Tentang.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs opacity-70">
        © {new Date().getFullYear()} ThriftLoop
      </div>
    </footer>
  )
}
