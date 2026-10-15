import { useEffect, useState } from 'react'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ProductForm from '../../components/products/ProductForm'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '../../lib/constants'
import { formatCurrency, slugify } from '../../lib/format'
import {
  archiveProduct,
  createProduct,
  deleteProductImage,
  fetchAdminProducts,
  fetchCategories,
  updateProduct,
  uploadProductImage,
  upsertCategory,
} from '../../services/products'

const emptyForm = {
  sku: '', name: '', description: '', brand: '', category_id: '',
  size_label: 'M', condition_label: 'Good', condition_notes: '',
  cost_price: '', selling_price: '', stock: 1,
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [files, setFiles] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      setLoading(true)
      setError('')
      const [rows, cats] = await Promise.all([
        fetchAdminProducts({ search, includeArchived }),
        fetchCategories(),
      ])
      setProducts(rows)
      setCategories(cats)
    } catch (err) {
      setError(err.message || 'Gagal memuat produk')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, includeArchived])

  function startEdit(product) {
    setEditingId(product.id)
    setSelected(product)
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      brand: product.brand || '',
      category_id: product.category_id || '',
      size_label: product.size_label || 'M',
      condition_label: product.condition_label || 'Good',
      condition_notes: product.condition_notes || '',
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      stock: product.stock,
    })
  }

  function resetForm() {
    setEditingId(null)
    setSelected(null)
    setForm(emptyForm)
    setFiles([])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        stock: Number(form.stock) || 0,
      }
      let productId = editingId
      if (editingId) await updateProduct(editingId, payload)
      else {
        const created = await createProduct(payload)
        productId = created.id
      }
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('Tipe gambar tidak didukung')
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) throw new Error(`Maksimal ${MAX_IMAGE_SIZE_MB}MB per foto`)
        await uploadProductImage(productId, file, i)
      }
      setMessage(editingId ? 'Produk diperbarui' : 'Produk dibuat')
      resetForm()
      await load()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan produk')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive(id) {
    if (!window.confirm('Arsipkan produk ini?')) return
    try {
      await archiveProduct(id)
      setMessage('Produk diarsipkan')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    if (!newCategory.trim()) return
    try {
      await upsertCategory({ name: newCategory.trim(), slug: slugify(newCategory) })
      setNewCategory('')
      await load()
      setMessage('Kategori ditambahkan')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteImage(image) {
    try {
      await deleteProductImage(image)
      await load()
      if (selected) {
        const refreshed = (await fetchAdminProducts({ includeArchived: true })).find((p) => p.id === selected.id)
        setSelected(refreshed || null)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-[var(--color-forest)]">Manajemen produk</h1>
        <p className="text-[var(--color-stone)]">CRUD produk, kategori, dan foto.</p>
      </div>
      {message ? <Alert type="success">{message}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input className="rounded-xl border border-[var(--color-line)] px-3 py-2" placeholder="Cari nama/SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
              Tampilkan arsip
            </label>
          </div>
          {loading ? <Spinner /> : null}
          {!loading && products.length === 0 ? <EmptyState title="Belum ada produk" /> : null}
          <div className="table-wrap card-surface">
            <table className="data">
              <thead><tr><th>Produk</th><th>Harga</th><th>Stok</th><th></th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-[var(--color-stone)]">{p.sku} · {p.category?.name || '-'}</p>
                      {!p.is_active ? <span className="badge badge-warn">Arsip</span> : null}
                    </td>
                    <td>{formatCurrency(p.selling_price)}</td>
                    <td>{p.stock}</td>
                    <td className="space-x-2 whitespace-nowrap">
                      <button type="button" className="btn btn-ghost text-sm" onClick={() => startEdit(p)}>Edit</button>
                      {p.is_active ? (
                        <button type="button" className="btn btn-ghost text-sm text-[var(--color-clay)]" onClick={() => handleArchive(p.id)}>Arsip</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleAddCategory} className="card-surface flex gap-2 p-4">
            <input className="flex-1 rounded-xl border border-[var(--color-line)] px-3 py-2" placeholder="Kategori baru" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <button type="submit" className="btn btn-secondary">Tambah</button>
          </form>
          <ProductForm
            form={form}
            setForm={setForm}
            categories={categories}
            editingId={editingId}
            selected={selected}
            files={files}
            setFiles={setFiles}
            saving={saving}
            onSubmit={handleSave}
            onCancel={resetForm}
            onDeleteImage={handleDeleteImage}
          />
        </div>
      </div>
    </div>
  )
}
