import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface ActiveProfile {
  name: string
  userId: string | null
  isOwner: boolean
  permissions: string[] // allowed route paths, e.g. ["/client/queue", "/client/leads"]
}

interface ActiveProfileContextValue {
  profile: ActiveProfile
  switchToProfile: (userId: string, name: string, permissions: string[], enteredPin: string, storedPin: string | null) => boolean
  returnToOwner: (ownerName: string) => void
}

const DEFAULT_PROFILE: ActiveProfile = {
  name: '',
  userId: null,
  isOwner: true,
  permissions: [],
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
    permissions: string[],
    enteredPin: string,
    storedPin: string | null,
  ): boolean => {
    if (!storedPin || enteredPin !== storedPin) return false
    setProfile({ name, userId, isOwner: false, permissions })
    return true
  }

  const returnToOwner = (ownerName: string) => {
    setProfile({ name: ownerName, userId: null, isOwner: true, permissions: [] })
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
