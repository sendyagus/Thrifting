import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const { signIn, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isAuthenticated) {
    return <Navigate to={location.state?.from || '/admin'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate(location.state?.from || '/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Login gagal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-sand)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--color-line)] bg-white p-8 shadow-[0_20px_50px_rgba(20,36,28,0.08)]">
        <Link to="/" className="font-display text-2xl font-bold text-[var(--color-forest)]">
          Thrift<span className="text-[var(--color-clay)]">Loop</span>
        </Link>
        <h1 className="mt-4 font-display text-3xl text-[var(--color-ink)]">Login staf</h1>
        <p className="mt-2 text-sm text-[var(--color-stone)]">Masuk untuk mengelola produk, stok, dan kasir.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? <Alert type="error">{error}</Alert> : null}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
            {submitting ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
