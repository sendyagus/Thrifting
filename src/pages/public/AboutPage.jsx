export default function AboutPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl">
        <p className="font-display text-5xl font-bold text-[var(--color-forest)]">ThriftLoop</p>
        <h1 className="mt-4 font-display text-3xl text-[var(--color-ink)]">Tentang toko</h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--color-ink)]/85">
          ThriftLoop adalah ruang digital untuk toko pakaian thrift: katalog publik yang nyaman dijelajahi,
          terhubung dengan inventaris dan kasir di belakang layar. Kami percaya pakaian bekas berkualitas
          pantas mendapat presentasi yang rapi tanpa mengubah pengalaman belanja menjadi checkout online.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5">
            <h2 className="font-display text-xl text-[var(--color-forest)]">Konsep</h2>
            <p className="mt-2 text-sm text-[var(--color-ink)]/80">
              Kurasi pakaian preloved dengan informasi ukuran, kondisi, dan harga yang transparan.
              Stok di website mengikuti kondisi nyata di toko.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5">
            <h2 className="font-display text-xl text-[var(--color-forest)]">Jam operasional</h2>
            <p className="mt-2 text-sm text-[var(--color-ink)]/80">
              Senin–Sabtu: 10.00–20.00
              <br />
              Minggu: 12.00–18.00
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-[var(--color-forest)] p-6 text-white">
          <h2 className="font-display text-xl">Lokasi</h2>
          <p className="mt-2 text-sm text-white/85">
            Perbarui alamat toko di sini setelah lokasi final dikonfirmasi. Sementara itu, pelanggan dapat
            menjelajahi katalog dan datang langsung untuk mencoba serta membeli.
          </p>
        </div>
      </div>
    </div>
  )
}
