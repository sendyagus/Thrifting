import { CONDITION_OPTIONS, MAX_IMAGE_SIZE_MB, SIZE_OPTIONS } from '../../lib/constants'

export default function ProductForm({
  form,
  setForm,
  categories,
  editingId,
  selected,
  files,
  setFiles,
  saving,
  onSubmit,
  onCancel,
  onDeleteImage,
}) {
  return (
    <form onSubmit={onSubmit} className="card-surface space-y-3 p-5">
      <h2 className="font-display text-xl">{editingId ? 'Edit produk' : 'Tambah produk'}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label>SKU</label>
          <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div className="field">
          <label>Nama</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Brand</label>
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        </div>
        <div className="field">
          <label>Kategori</label>
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">-</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Ukuran</label>
          <select value={form.size_label} onChange={(e) => setForm({ ...form, size_label: e.target.value })}>
            {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Kondisi</label>
          <select value={form.condition_label} onChange={(e) => setForm({ ...form, condition_label: e.target.value })}>
            {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Harga modal</label>
          <input type="number" min="0" required value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
        </div>
        <div className="field">
          <label>Harga jual</label>
          <input type="number" min="0" required value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
        </div>
        <div className="field">
          <label>Stok awal</label>
          <input type="number" min="0" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={Boolean(editingId)} />
        </div>
        <div className="field sm:col-span-2">
          <label>Deskripsi</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field sm:col-span-2">
          <label>Catatan kondisi</label>
          <textarea rows={2} value={form.condition_notes} onChange={(e) => setForm({ ...form, condition_notes: e.target.value })} />
        </div>
        <div className="field sm:col-span-2">
          <label>Foto (jpg/png/webp, max {MAX_IMAGE_SIZE_MB}MB)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          {files?.length ? <p className="text-xs text-[var(--color-stone)]">{files.length} file dipilih</p> : null}
        </div>
      </div>

      {selected?.images?.length ? (
        <div className="flex flex-wrap gap-2">
          {selected.images.map((img) => (
            <div key={img.id} className="relative">
              <img src={img.url} alt="" className="h-20 w-16 rounded-lg object-cover" />
              <button type="button" className="absolute right-1 top-1 rounded bg-black/60 px-1 text-xs text-white" onClick={() => onDeleteImage(img)}>x</button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        {editingId ? <button type="button" className="btn btn-secondary" onClick={onCancel}>Batal</button> : null}
      </div>
    </form>
  )
}
