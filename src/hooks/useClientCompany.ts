import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Company } from '../types'

interface ClientCompanyState {
  company: Company | null
  companyId: string | null
  loading: boolean
  isAdmin: boolean
}

export function useClientCompany(): ClientCompanyState {
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

      const isAdmin = userRow?.role === 'admin'

      setState({
        company: company ?? null,
        companyId: company?.id ?? null,
        loading: false,
        isAdmin,
      })
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { load() })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  return state
}
