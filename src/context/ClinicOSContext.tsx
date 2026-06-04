import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { PackageType } from '../types/clinicOS'

interface DemoUser {
  name: string
  clinicName: string
  email: string
}

interface ClinicOSContextValue {
  isDemo: boolean
  packageType: PackageType
  setPackageType: (p: PackageType) => void
  isLoggedIn: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  signup: (data: SignupData) => Promise<void>
  demoUser: DemoUser | null
}

interface SignupData {
  ownerName: string
  clinicName: string
  email: string
  phone: string
  city: string
  clinicType: string
  password: string
}

const ClinicOSContext = createContext<ClinicOSContextValue | null>(null)

const STORAGE_KEY = 'clinicos_session'

export const ClinicOSProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [packageType, setPackageTypeState] = useState<PackageType>('growth')
  const [demoUser, setDemoUser] = useState<DemoUser | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const session = JSON.parse(raw)
        setIsLoggedIn(true)
        setDemoUser(session.user)
        setPackageTypeState(session.packageType || 'growth')
      }
    } catch { /* ignore */ }
  }, [])

  const login = async (email: string, _password: string) => {
    await new Promise(r => setTimeout(r, 800))
    const user: DemoUser = {
      name: 'د. أحمد الحربي',
      clinicName: 'عيادات نور للأسنان',
      email,
    }
    setDemoUser(user)
    setIsLoggedIn(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, packageType }))
  }

  const signup = async (data: SignupData) => {
    await new Promise(r => setTimeout(r, 1000))
    const user: DemoUser = {
      name: data.ownerName,
      clinicName: data.clinicName,
      email: data.email,
    }
    localStorage.setItem('clinicos_pending_user', JSON.stringify(user))
  }

  const logout = () => {
    setIsLoggedIn(false)
    setDemoUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const setPackageType = (p: PackageType) => {
    setPackageTypeState(p)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const session = JSON.parse(raw)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, packageType: p }))
    }
  }

  return (
    <ClinicOSContext.Provider value={{
      isDemo: true,
      packageType,
      setPackageType,
      isLoggedIn,
      login,
      logout,
      signup,
      demoUser,
    }}>
      {children}
    </ClinicOSContext.Provider>
  )
}

export const useClinicOS = () => {
  const ctx = useContext(ClinicOSContext)
  if (!ctx) throw new Error('useClinicOS must be used inside ClinicOSProvider')
  return ctx
}
