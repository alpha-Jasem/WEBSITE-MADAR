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

      const [{ data: userRow }, { data: companyDirect }] = await Promise.all([
        supabase.from('users').select('role, company_id').eq('id', user.id).single(),
        supabase.from('companies').select('*').eq('auth_user_id', user.id).single(),
      ])

      if (!mounted) return

      // Fallback 1: legacy linkage via users.company_id
      let company = companyDirect
      if (!company && userRow?.company_id) {
        const { data: legacyCompany } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userRow.company_id)
          .single()
        company = legacyCompany ?? null
      }

      // Fallback 2: match by owner_email (accounts created before auth_user_id existed)
      if (!company && user.email) {
        const { data: emailCompany } = await supabase
          .from('companies')
          .select('*')
          .eq('owner_email', user.email)
          .maybeSingle()
        if (emailCompany) {
          // Backfill auth_user_id so future lookups are instant
          supabase.from('companies').update({ auth_user_id: user.id }).eq('id', emailCompany.id)
          company = emailCompany
        }
      }

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
