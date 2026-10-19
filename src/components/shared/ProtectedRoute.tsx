import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'client' | 'marketer'
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const mounted = useRef(true)
  const retries = useRef(0)

  useEffect(() => {
    mounted.current = true
    let retryTimer = 0

    // The role is cached per user so a flaky connection can never downgrade or sign out a logged-in admin.
    const roleKey = (id: string) => `madar_role_${id}`
    const readRole = (id: string) => { try { return localStorage.getItem(roleKey(id)) } catch { return null } }
    const writeRole = (id: string, role: string) => { try { localStorage.setItem(roleKey(id), role) } catch { /* private mode */ } }

    const checkAuth = async () => {
      try {
        // getSession reads the stored session and refreshes an expired token before answering;
        // getUser asked the server with a possibly stale token and logged people out after the phone slept.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted.current) return

        if (!session) {
          // a network error is not a sign-out: keep the screen and let the next event decide
          if (sessionError) { setIsLoading(false); return }
          setIsAuthed(false)
          setIsLoading(false)
          return
        }

        setIsAuthed(true)
        const user = session.user

        if (requiredRole) {
          const cached = readRole(user.id)
          if (cached) { setUserRole(cached); setIsLoading(false) }
          const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          if (!mounted.current) return
          if (!error && data?.role) { writeRole(user.id, data.role); setUserRole(data.role) }
          else if (!cached) {
            if (error) { if (retries.current++ < 6) retryTimer = window.setTimeout(checkAuth, 2500) }
            else setUserRole('client')
          }
        }

        setIsLoading(false)
      } catch {
        if (!mounted.current) return
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
      window.clearTimeout(retryTimer)
      listener?.subscription.unsubscribe()
    }
  }, [requiredRole])

  if (isLoading) return null

  if (!isAuthed) {
    // Workspace OS dashboard → go to clinic login
    if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/clinic-os/dashboard')) {
      // keep the deep link (e.g. one conversation) so it opens after sign-in
      return <Navigate to={`/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`} replace />
    }
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    const portal = requiredRole ? `&portal=${requiredRole}` : ''
    return <Navigate to={`/admin/login?redirect=${redirect}${portal}`} replace />
  }

  if (requiredRole && userRole === null) return null

  if (requiredRole && userRole !== requiredRole && userRole !== 'admin') {
    // Workspace users trying to access wrong portal → redirect to clinic dashboard
    if (location.pathname.startsWith('/clinic-os/')) {
      return <Navigate to="/login" replace />
    }
    return <Navigate to="/client" replace />
  }

  return <>{children}</>
}
