import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { PackageType } from '../types/clinicOS'
import { supabase, signOut } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ToastProvider } from '../components/clinicOS/ui/Toast'

interface ClinicOSContextValue {
  packageType: PackageType
  setPackageType: (p: PackageType) => void
  clinicName: string
  userName: string
  companyId: string | null
  isDemo: boolean
  logout: () => void
}

const ClinicOSContext = createContext<ClinicOSContextValue | null>(null)

const PACKAGE_KEY = 'clinicos_package'

export const ClinicOSProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate()
  const [packageType, setPackageTypeState] = useState<PackageType>(() =>
    (localStorage.getItem(PACKAGE_KEY) as PackageType) || 'whatsapp'
  )
  const [clinicName, setClinicName] = useState('')
  const [userName, setUserName] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) return

        const [companyRes, userRes] = await Promise.allSettled([
          supabase.from('companies').select('id, name, package_type, status').eq('auth_user_id', user.id).single(),
          supabase.from('users').select('full_name').eq('id', user.id).single(),
        ])

        const company = companyRes.status === 'fulfilled' ? companyRes.value.data : null
        const userRow = userRes.status === 'fulfilled' ? userRes.value.data : null

        if (company?.id) setCompanyId(company.id)
        if (company?.name) setClinicName(company.name)
        setIsDemo(!company || company.status === 'trial')
        if (userRow?.full_name) setUserName(userRow.full_name)
        if (company?.package_type) {
          const pkg = company.package_type as PackageType
          setPackageTypeState(pkg)
          localStorage.setItem(PACKAGE_KEY, pkg)
        }
      } catch {
        // context loads with defaults, user can still use demo mode
      }
    }
    load()
  }, [])

  const setPackageType = (p: PackageType) => {
    setPackageTypeState(p)
    localStorage.setItem(PACKAGE_KEY, p)
  }

  const logout = async () => {
    await signOut()
    localStorage.removeItem(PACKAGE_KEY)
    navigate('/login', { replace: true })
  }

  return (
    <ClinicOSContext.Provider value={{ packageType, setPackageType, clinicName, userName, companyId, isDemo, logout }}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ClinicOSContext.Provider>
  )
}

export const useClinicOS = () => {
  const ctx = useContext(ClinicOSContext)
  if (!ctx) throw new Error('useClinicOS must be used inside ClinicOSProvider')
  return ctx
}
