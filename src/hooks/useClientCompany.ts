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

      const { data: userRow } = await supabase
        .from('users')
        .select('role, company_id')
        .eq('id', user.id)
        .single()

      if (!mounted) return

      const isAdmin = userRow?.role === 'admin'

      if (!userRow?.company_id) {
        setState({ company: null, companyId: null, loading: false, isAdmin })
        return
      }

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userRow.company_id)
        .single()

      if (!mounted) return
      setState({
        company: company ?? null,
        companyId: userRow.company_id,
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
