import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LoadingScreen } from './LoadingScreen'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'client'
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!mounted.current) return

        if (!user) {
          setIsAuthed(false)
          setIsLoading(false)
          return
        }

        setIsAuthed(true)

        if (requiredRole) {
          const { data } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          if (!mounted.current) return
          setUserRole(data?.role || 'client')
        }

        setIsLoading(false)
      } catch {
        if (!mounted.current) return
        setIsAuthed(false)
        setIsLoading(false)
      }
    }

    checkAuth()

    // Only handle SIGNED_OUT — don't re-run checkAuth on INITIAL_SESSION or TOKEN_REFRESHED
    // to avoid race conditions that cause white screen flashes
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted.current) return
      if (event === 'SIGNED_OUT') {
        setIsAuthed(false)
        setUserRole(null)
        setIsLoading(false)
      }
    })

    return () => {
      mounted.current = false
      listener?.subscription.unsubscribe()
    }
  }, [requiredRole])

  if (isLoading) return <LoadingScreen />

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
