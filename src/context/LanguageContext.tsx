import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Language } from '../types'

interface LanguageContextType {
  language: Language
  toggleLanguage: () => void
  t: (ar: ReactNode, en: ReactNode) => ReactNode
  dir: 'rtl' | 'ltr'
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  toggleLanguage: () => {},
  t: (ar) => ar,
  dir: 'rtl',
})

export const useLanguage = () => useContext(LanguageContext)

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('ar')

  const toggleLanguage = () => setLanguage(prev => prev === 'ar' ? 'en' : 'ar')

  const t = (ar: ReactNode, en: ReactNode): ReactNode => language === 'ar' ? ar : en

  const dir = language === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', language)
    document.body.setAttribute('dir', dir)
  }, [language, dir])

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}
