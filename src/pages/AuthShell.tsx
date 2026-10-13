import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import './clinicOS/clinic-os-login.css'

/** Same split layout as the sign-in page, for the password recovery screens. */
export const AuthShell = ({ title, lead, children }: { title: ReactNode; lead: string; children: ReactNode }) => {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  return (
    <main className="clinic-login" dir="rtl">
      <section className="clinic-login-brand">
        <img className="clinic-login-hero" src="/clinic-os/login-hero.png" alt="" aria-hidden="true" />
        <button className="clinic-login-logo" onClick={() => navigate('/login')}>
          <img src="/logo-main.png" alt="Madar.software" />
          <span><strong>Madar.software</strong></span>
        </button>
        <div className="clinic-login-message">
          <h1>{title}</h1>
          <p>{lead}</p>
        </div>
      </section>
      <section className="clinic-login-panel">
        <motion.div className="clinic-login-card" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          {children}
        </motion.div>
      </section>
    </main>
  )
}
