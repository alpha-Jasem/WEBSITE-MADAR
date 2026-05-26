import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Company } from '../types'

interface ClientCompanyState {
  company: Company | null
  companyId: string | null
  loading: boolean
  isAdmin: boolean
}

const ClientCompanyContext = createContext<ClientCompanyState>({
  company: null,
  companyId: null,
  loading: true,
  isAdmin: false,
})

export function ClientCompanyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClientCompanyState>({
    company: null,
    companyId: null,
    loading: true,
    isAdmin: false,
  })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) { setState(s => ({ ...s, loading: false })); return }

      const [{ data: userRow }, { data: company }] = await Promise.all([
        supabase.from('users').select('role').eq('id', user.id).single(),
        supabase.from('companies').select('*').eq('auth_user_id', user.id).single(),
      ])

      if (!mounted) return

      setState({
        company: company ?? null,
        companyId: company?.id ?? null,
        loading: false,
        isAdmin: userRow?.role === 'admin',
      })
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { load() })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  return (
    <ClientCompanyContext.Provider value={state}>
      {children}
    </ClientCompanyContext.Provider>
  )
}

export function useClientCompanyContext() {
  return useContext(ClientCompanyContext)
}
