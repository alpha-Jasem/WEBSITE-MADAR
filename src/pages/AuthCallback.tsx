import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { supabase, getCurrentUser } from '../lib/supabase'

export const AuthCallback = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()

  useEffect(() => {
    const handle = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        navigate('/login', { replace: true })
        return
      }

      const profile = await getCurrentUser()
      navigate(profile?.role === 'admin' ? '/admin' : '/client', { replace: true })
    }

    handle()
  }, [navigate])

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={40} className="text-gold-500 animate-spin" />
        <p className="text-slate-400 text-sm font-work">
          {t('جاري تسجيل الدخول...', 'Signing in...')}
        </p>
      </div>
    </div>
  )
}
