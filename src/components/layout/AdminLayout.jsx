import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const links = [
  { to: '/admin', label: 'Dashboard', end: true, roles: ['admin', 'cashier'] },
  { to: '/admin/products', label: 'Produk', roles: ['admin'] },
  { to: '/admin/inventory', label: 'Inventaris', roles: ['admin'] },
  { to: '/admin/pos', label: 'Kasir / POS', roles: ['admin', 'cashier'] },
  { to: '/admin/sales', label: 'Penjualan', roles: ['admin', 'cashier'] },
  { to: '/admin/reports', label: 'Laporan', roles: ['admin'] },
  { to: '/admin/users', label: 'Pengguna', roles: ['admin'] },
]

export default function AdminLayout() {
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/admin/login')
  }

  const visible = links.filter((link) => link.roles.includes(profile?.role))

  return (
    <div className="admin-layout bg-[var(--color-cream)]">
      <aside className="border-r border-[var(--color-line)] bg-[var(--color-forest)] text-white">
        <div className="px-5 py-6">
          <p className="font-display text-2xl font-bold">ThriftLoop</p>
          <p className="mt-1 text-xs text-white/70">Panel internal</p>
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-6">
          {visible.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-white/15 text-[var(--color-lime)]' : 'text-white/85 hover:bg-white/10'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 px-5 py-4 text-sm">
          <p className="font-semibold">{profile?.full_name}</p>
          <p className="text-white/70">{isAdmin ? 'Administrator' : 'Kasir'}</p>
          <button type="button" onClick={handleLogout} className="mt-3 text-[var(--color-lime)]">
            Keluar
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-white/70 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-stone)]">ThriftLoop Admin</p>
            <p className="font-display text-xl text-[var(--color-forest)]">Operasional toko</p>
          </div>
          <a href="/" className="btn btn-secondary text-sm">Lihat website</a>
        </header>
        <div className="p-5 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
