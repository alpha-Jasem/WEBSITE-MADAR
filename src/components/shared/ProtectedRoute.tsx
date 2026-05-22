import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'client'
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      setIsAuthed(true)

      if (requiredRole) {
        const { data } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
        setUserRole(data?.role || 'client')
      }

      setIsLoading(false)
    }

    checkAuth()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAuth()
    })

    return () => listener?.subscription.unsubscribe()
  }, [requiredRole])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <Loader2 size={40} className="text-gold-500 animate-spin" />
      </div>
    )
  }

  if (!isAuthed) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    const portal = requiredRole ? `&portal=${requiredRole}` : ''
    return <Navigate to={`/login?redirect=${redirect}${portal}`} replace />
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/client'} replace />
  }

  return <>{children}</>
}
