import { useEffect, useState } from 'react'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import { formatDate } from '../../lib/format'
import { fetchUsers, updateUserProfile } from '../../services/users'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    try {
      setLoading(true)
      setUsers(await fetchUsers())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function patchUser(id, payload) {
    setError('')
    setMessage('')
    try {
      await updateUserProfile(id, payload)
      setMessage('Pengguna diperbarui')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-[var(--color-forest)]">Manajemen pengguna</h1>
        <p className="text-[var(--color-stone)]">Atur peran admin/kasir dan status aktif staf.</p>
      </div>

      <Alert type="info">
        Buat akun staf baru lewat Supabase Auth (Invite user / Add user). Trigger otomatis membuat baris di profiles (role default cashier). Set role admin/kasir di halaman ini, atau jalankan supabase/bootstrap_admin.sql untuk admin pertama.
      </Alert>

      {message ? <Alert type="success">{message}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      {loading ? <Spinner /> : (
        <div className="table-wrap card-surface">
          <table className="data">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Peran</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <p className="font-semibold">{user.full_name}</p>
                    <p className="text-xs text-[var(--color-stone)]">{user.id}</p>
                  </td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => patchUser(user.id, { role: e.target.value })}
                      className="rounded-lg border border-[var(--color-line)] px-2 py-1"
                    >
                      <option value="admin">admin</option>
                      <option value="cashier">cashier</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-ok' : 'badge-danger'}`}>
                      {user.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => patchUser(user.id, { is_active: !user.is_active })}
                    >
                      {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
