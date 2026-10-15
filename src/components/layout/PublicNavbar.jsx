import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Beranda' },
  { to: '/catalog', label: 'Katalog' },
  { to: '/about', label: 'Tentang' },
]

export default function PublicNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[rgba(250,247,240,0.92)] backdrop-blur">
      <div className="container flex items-center justify-between py-4">
        <Link to="/" className="font-display text-2xl font-bold text-[var(--color-forest)]">
          Thrift<span className="text-[var(--color-clay)]">Loop</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-semibold ${isActive ? 'text-[var(--color-clay)]' : 'text-[var(--color-forest)]'}`
              }
              end={link.to === '/'}
            >
              {link.label}
            </NavLink>
          ))}
          <Link to="/admin/login" className="btn btn-secondary text-sm">
            Login staf
          </Link>
        </nav>

        <button
          type="button"
          className="btn btn-ghost md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? 'Tutup' : 'Menu'}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[var(--color-line)] px-4 py-3 md:hidden">
          <div className="container flex flex-col gap-3">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className="font-semibold">
                {link.label}
              </NavLink>
            ))}
            <Link to="/admin/login" onClick={() => setOpen(false)} className="btn btn-secondary w-fit">
              Login staf
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
