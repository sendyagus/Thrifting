import { Navigate, useLocation } from 'react-router-dom'
import Spinner from '../ui/Spinner'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, roles = ['admin', 'cashier'] }) {
  const { loading, isAuthenticated, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen">
        <Spinner label="Memeriksa sesi..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (!profile?.is_active || !roles.includes(profile.role)) {
    return <Navigate to="/admin" replace />
  }

  return children
}
