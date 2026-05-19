import { Routes, Route } from 'react-router-dom'
import { AdminSidebar } from '../components/dashboard/admin/AdminSidebar'
import { AdminOverview } from '../components/dashboard/admin/AdminOverview'
import { AdminCompanies } from '../components/dashboard/admin/AdminCompanies'
import { AdminAutomations } from '../components/dashboard/admin/AdminAutomations'
import { AdminLeads } from '../components/dashboard/admin/AdminLeads'
import { AdminLogs } from '../components/dashboard/admin/AdminLogs'
import { AdminSettings } from '../components/dashboard/admin/AdminSettings'
import { AdminN8n } from '../components/dashboard/admin/AdminN8n'

export const AdminDashboard = () => (
  <div className="flex h-screen overflow-hidden" style={{ background: '#060810', direction: 'rtl', position: 'relative' }}>

    {/* ── Aurora Mesh Background ── */}
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* Base — أفتح من السابق */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, #0d1530 0%, #080c1a 60%)' }} />

      {/* Aurora blob 1 — cyan top-left */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: 750, height: 750, borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
        background: 'radial-gradient(ellipse, rgba(0,191,255,0.45) 0%, rgba(0,140,220,0.2) 40%, transparent 70%)',
        filter: 'blur(55px)',
        animation: 'aurora1 14s ease-in-out infinite alternate',
      }} />

      {/* Aurora blob 2 — purple center */}
      <div style={{
        position: 'absolute', top: '20%', left: '35%',
        width: 650, height: 550, borderRadius: '40% 60% 30% 70% / 60% 40% 60% 40%',
        background: 'radial-gradient(ellipse, rgba(140,80,255,0.38) 0%, rgba(100,50,220,0.15) 50%, transparent 70%)',
        filter: 'blur(65px)',
        animation: 'aurora2 18s ease-in-out infinite alternate',
      }} />

      {/* Aurora blob 3 — green bottom-right */}
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-5%',
        width: 700, height: 600, borderRadius: '50% 50% 40% 60% / 40% 60% 50% 50%',
        background: 'radial-gradient(ellipse, rgba(0,220,130,0.32) 0%, rgba(0,180,90,0.14) 50%, transparent 70%)',
        filter: 'blur(60px)',
        animation: 'aurora3 16s ease-in-out infinite alternate',
      }} />

      {/* Aurora blob 4 — gold top-right */}
      <div style={{
        position: 'absolute', top: '5%', right: '10%',
        width: 450, height: 380,
        background: 'radial-gradient(ellipse, rgba(245,158,11,0.28) 0%, rgba(230,120,0,0.1) 50%, transparent 70%)',
        filter: 'blur(50px)',
        animation: 'aurora4 12s ease-in-out infinite alternate',
      }} />

      {/* Subtle dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }} />

      {/* Top beam */}
      <div style={{
        position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.4), rgba(120,80,255,0.3), transparent)',
      }} />
    </div>

    {/* Aurora keyframes */}
    <style>{`
      @keyframes aurora1 {
        0%   { transform: translate(0,0) scale(1) rotate(0deg); }
        100% { transform: translate(80px, 60px) scale(1.15) rotate(8deg); }
      }
      @keyframes aurora2 {
        0%   { transform: translate(0,0) scale(1) rotate(0deg); }
        100% { transform: translate(-60px, 80px) scale(1.1) rotate(-6deg); }
      }
      @keyframes aurora3 {
        0%   { transform: translate(0,0) scale(1) rotate(0deg); }
        100% { transform: translate(-80px, -50px) scale(1.2) rotate(10deg); }
      }
      @keyframes aurora4 {
        0%   { transform: translate(0,0) scale(1); }
        100% { transform: translate(40px, 30px) scale(1.15); }
      }

      /* Glass cards */
      .glass-card {
        background: rgba(255,255,255,0.04) !important;
        backdrop-filter: blur(20px) saturate(150%) !important;
        -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
      }
    `}</style>

    {/* Sidebar */}
    <div style={{ position: 'relative', zIndex: 10 }}>
      <AdminSidebar />
    </div>

    {/* Main content */}
    <main className="flex-1 overflow-y-auto relative" style={{ zIndex: 10, padding: '28px 32px' }}>
      <Routes>
        <Route index              element={<AdminOverview />} />
        <Route path="companies"   element={<AdminCompanies />} />
        <Route path="automations" element={<AdminAutomations />} />
        <Route path="leads"       element={<AdminLeads />} />
        <Route path="logs"        element={<AdminLogs />} />
        <Route path="settings"    element={<AdminSettings />} />
        <Route path="n8n"         element={<AdminN8n />} />
        <Route path="analytics"   element={<AdminOverview />} />
        <Route path="pipeline"    element={<AdminLeads />} />
        <Route path="messages"    element={<AdminLogs />} />
        <Route path="*"           element={<AdminOverview />} />
      </Routes>
    </main>
  </div>
)
