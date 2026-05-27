import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type ActiveRole = 'owner' | 'manager' | 'staff'

interface ActiveProfile {
  role: ActiveRole
  name: string
  userId: string | null
  isOwner: boolean
}

interface ActiveProfileContextValue {
  profile: ActiveProfile
  switchToProfile: (userId: string, name: string, role: ActiveRole, enteredPin: string, storedPin: string | null) => boolean
  returnToOwner: (ownerName: string) => void
}

const DEFAULT_PROFILE: ActiveProfile = {
  role: 'owner',
  name: '',
  userId: null,
  isOwner: true,
}

const SESSION_KEY = 'madar_active_profile'

const ActiveProfileContext = createContext<ActiveProfileContextValue>({
  profile: DEFAULT_PROFILE,
  switchToProfile: () => false,
  returnToOwner: () => {},
})

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ActiveProfile>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE
    } catch {
      return DEFAULT_PROFILE
    }
  })

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(profile))
  }, [profile])

  const switchToProfile = (
    userId: string,
    name: string,
    role: ActiveRole,
    enteredPin: string,
    storedPin: string | null,
  ): boolean => {
    if (!storedPin || enteredPin !== storedPin) return false
    setProfile({ role, name, userId, isOwner: false })
    return true
  }

  const returnToOwner = (ownerName: string) => {
    setProfile({ role: 'owner', name: ownerName, userId: null, isOwner: true })
  }

  return (
    <ActiveProfileContext.Provider value={{ profile, switchToProfile, returnToOwner }}>
      {children}
    </ActiveProfileContext.Provider>
  )
}

export function useActiveProfile() {
  return useContext(ActiveProfileContext)
}
