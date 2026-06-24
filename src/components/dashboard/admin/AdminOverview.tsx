import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'

type VisitRow = { id: string; company_id: string | null; created_at: string | null; subtotal?: number | null; total_amount?: number | null; price?: number | null }
type LeadRow = { id: string; created_at: string | null; stage?: string | null }

const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
function dayKey(date: Date) { return date.toISOString().slice(0, 10) }
function formatSar(value: number) { return `${Math.round(value).toLocaleString('ar-SA')} ر.س` }

function useCountUp(target: number, active: boolean, duration = 1300) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    if (target === 0) { setVal(0); return }
    let raf: number
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])
  return val
}

function AnimStat({
  label, numericValue, format = (n: number) => n.toLocaleString('ar-SA'),
  delta, suffix = '',
}: {
  label: string
  numericValue: number
  format?: (n: number) => string
  delta?: { pct: number; label: string } | null
  suffix?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); obs.disconnect() } }, { threshold: 0.2 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  const val = useCountUp(numericValue, seen)
  return (
    <div ref={ref} className="stat">
      <div className="stat-top"><div className="stat-label">{label}</div></div>
      <div className="stat-value num">{format(val)}{suffix}</div>
      {delta && (
        <div className={`stat-delta ${delta.pct >= 0 ? 'up' : 'down'}`}>
          <span>{delta.pct >= 0 ? '↑' : '↓'} {Math.abs(delta.pct)}%</span>
          <span className="muted" style={{ marginRight: 5 }}>{delta.label}</span>
        </div>
      )}
    </div>
  )
}

function trend(curr: number, prev: number): { pct: number; label: string } | null {
  if (prev === 0) return null
  return { pct: Math.round(((curr - prev) / prev) * 100), label: 'مقارنة بالأسبوع الماضي' }
}

export const AdminOverview = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const since = new Date(); since.setDate(since.getDate() - 30)
      const [companiesRes, visitsRes, leadsRes] = await Promise.all([
        supabase.from('companies').select('*').order('created_at', { ascending: false }),
        supabase.from('cw_visits').select('id, company_id, created_at, subtotal, total_amount, price').gte('created_at', since.toISOString()),
        supabase.from('crm_leads').select('id, created_at, stage').gte('created_at', since.toISOString()),
      ])
      setCompanies((companiesRes.data ?? []) as Company[])
      setVisits((visitsRes.data ?? []) as VisitRow[])
      setLeads((leadsRes.data ?? []) as LeadRow[])
      setLoading(false)
    }
    load()
  }, [])

  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setDate(date.getDate() - (6 - index))
      const key = dayKey(date)
      const dayVisits = visits.filter(v => (v.created_at || '').startsWith(key))
      return {
        day: dayNames[date.getDay()],
        revenue: Math.round(dayVisits.reduce((s, v) => s + Number(v.total_amount ?? v.subtotal ?? v.price ?? 0), 0)),
        visits: dayVisits.length,
        leads: leads.filter(l => (l.created_at || '').startsWith(key)).length,
      }
    })
  }, [visits, leads])

  const { revenue, revenueThisWeek, revenuePrevWeek, visitsThisWeek, visitsPrevWeek } = useMemo(() => {
    const now = new Date()
    const d7 = new Date(now); d7.setDate(d7.getDate() - 7)
    const d14 = new Date(now); d14.setDate(d14.getDate() - 14)
    const thisW = visits.filter(v => v.created_at && new Date(v.created_at) >= d7)
    const prevW = visits.filter(v => v.created_at && new Date(v.created_at) >= d14 && new Date(v.created_at) < d7)
    const sumR = (arr: VisitRow[]) => arr.reduce((s, v) => s + Number(v.total_amount ?? v.subtotal ?? v.price ?? 0), 0)
    return {
      revenue: visits.reduce((s, v) => s + Number(v.total_amount ?? v.subtotal ?? v.price ?? 0), 0),
      revenueThisWeek: sumR(thisW), revenuePrevWeek: sumR(prevW),
      visitsThisWeek: thisW.length, visitsPrevWeek: prevW.length,
    }
  }, [visits])

  const activeCompanies = companies.filter(c => c.status === 'active').length
  const clinicOSCount = companies.length
  const convertedLeads = leads.filter(l => l.stage === 'won' || l.stage === 'converted').length
  const conversion = leads.length ? Math.round((convertedLeads / leads.length) * 100) : 0

  const avatarColor = (name: string) => {
    const hue = (name.charCodeAt(0) * 47 + name.charCodeAt(1 % name.length) * 13) % 360
    return `hsl(${hue}, 55%, 38%)`
  }

  if (loading) {
    return (
      <div className="page fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="stat-grid">
            {[0,1,2,3].map(i => <div key={i} className="stat skeleton-pulse" style={{ height: 112 }} />)}
          </div>
          <div className="card" style={{ height: 320 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="page fade-in">
      {/* Header */}
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">نظرة عامة على المنصة</div>
          <div className="sec-sub">إيرادات العيادات، نشاط المواعيد، وحركة العملاء في آخر 30 يوم</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="badge green"><div className="bdot" />مباشر</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <AnimStat
          label="إيراد 30 يوم"
          numericValue={revenue}
          format={formatSar}
          delta={trend(revenueThisWeek, revenuePrevWeek)}
        />
        <AnimStat
          label="زيارات مسجلة"
          numericValue={visits.length}
          delta={trend(visitsThisWeek, visitsPrevWeek)}
        />
        <div className="stat">
          <div className="stat-top"><div className="stat-label">شركات نشطة</div></div>
          <div className="stat-value num">{activeCompanies}<span className="cur">/ {companies.length}</span></div>
          <div className="stat-delta up">
            <span>{Math.round((activeCompanies / Math.max(companies.length, 1)) * 100)}%</span>
            <span className="muted" style={{ marginRight: 5 }}>معدل التفعيل</span>
          </div>
        </div>
        <AnimStat
          label="تحويل المبيعات"
          numericValue={conversion}
          suffix="%"
          format={n => String(n)}
          delta={leads.length > 0 ? { pct: conversion, label: 'نسبة إغلاق الليدز' } : null}
        />
      </div>

      {/* Chart */}
      <div className="card card-pad chartbox" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>الحركة اليومية</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 20 }}>آخر 7 أيام: الإيرادات، الزيارات، والعملاء المحتملون</div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="adminRevGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.60 0.27 258)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.60 0.27 258)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="adminVisitGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.68 0.17 152)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="oklch(0.68 0.17 152)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(8,15,36,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--ink)' }}
                cursor={{ stroke: 'rgba(48,120,255,0.25)', strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="revenue" name="الإيراد" stroke="oklch(0.60 0.27 258)" fill="url(#adminRevGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'oklch(0.60 0.27 258)', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="visits" name="الزيارات" stroke="var(--green)" fill="url(#adminVisitGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--green)', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="leads" name="العملاء المحتملون" stroke="var(--amber)" fill="transparent" strokeWidth={1.8} dot={false} activeDot={{ r: 4, fill: 'var(--amber)', strokeWidth: 0 }} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Chart legend */}
        <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { color: 'oklch(0.60 0.27 258)', label: 'الإيراد' },
            { color: 'var(--green)', label: 'الزيارات' },
            { color: 'var(--amber)', label: 'العملاء المحتملون', dashed: true },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 2, background: l.dashed ? 'none' : l.color, borderTop: l.dashed ? `2px dashed ${l.color}` : 'none', borderRadius: 2 }} />
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Company distribution */}
        <div className="card card-pad">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>توزيع الحسابات</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>{clinicOSCount} عميل على منصة Clinic OS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'شركات نشطة', value: activeCompanies, color: 'var(--green)', pct: Math.round((activeCompanies / Math.max(companies.length, 1)) * 100) },
              { label: 'تجربة أو موقوفة', value: companies.length - activeCompanies, color: 'var(--amber)', pct: Math.round(((companies.length - activeCompanies) / Math.max(companies.length, 1)) * 100) },
              { label: 'عملاء Clinic OS', value: clinicOSCount, color: 'var(--primary)', pct: 100 },
            ].map(row => (
              <div key={row.label}>
                <div className="row gap-2" style={{ marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
                <div className="prog">
                  <div className="prog-fill" style={{ width: `${row.pct}%`, background: row.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message usage */}
        <div className="card card-pad">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>استهلاك الرسائل</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {companies.slice(0, 5).map(company => {
              const usage = company.message_limit ? Math.round(((company.messages_used || 0) / company.message_limit) * 100) : 0
              return (
                <div key={company.id}>
                  <div className="row gap-2" style={{ marginBottom: 5 }}>
                    <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: usage >= 80 ? 'var(--red)' : 'var(--ink-3)', flexShrink: 0 }}>{usage}%</span>
                  </div>
                  <div className="prog">
                    <div className="prog-fill" style={{ width: `${usage}%`, background: usage >= 80 ? 'var(--red)' : usage >= 60 ? 'var(--amber)' : 'var(--primary)' }} />
                  </div>
                </div>
              )
            })}
            {companies.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)', textAlign: 'center', padding: '20px 0' }}>لا توجد شركات بعد</div>
            )}
          </div>
        </div>

        {/* Recent companies feed */}
        <div className="card card-pad">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>أحدث الانضمامات</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {companies.slice(0, 5).map((company, i) => (
              <div key={company.id} className="activity-item fade-in" style={{ animationDelay: `${i * 0.07}s`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="av" style={{ background: avatarColor(company.name || 'م'), fontSize: 12, width: 34, height: 34, borderRadius: 9 }}>
                  {(company.name || 'م').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {company.created_at ? new Date(company.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : '—'}
                  </div>
                </div>
                <div className={`badge ${company.status === 'active' ? 'green' : 'amber'}`} style={{ flexShrink: 0 }}>
                  <div className="bdot" />
                  {company.status === 'active' ? 'نشطة' : 'تجربة'}
                </div>
              </div>
            ))}
            {companies.length === 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)', textAlign: 'center', padding: '20px 0' }}>لا توجد شركات بعد</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
