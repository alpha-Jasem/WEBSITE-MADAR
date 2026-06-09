import { useState } from 'react'

const workflowGroups = [
  {
    group: 'Voice AI — Vapi / ElevenLabs',
    color: '#8B5CF6',
    workflows: [
      { id: 'SAFOocJXld4vHAfH', name: 'Vapi MCP Server',         active: true,  trigger: 'Webhook (MCP)', runs: null, updatedAt: '2026-05-05' },
      { id: 'l2aLJ4ost3gBma4V', name: 'ElevenLabs Tool Router',  active: true,  trigger: 'Webhook',       runs: null, updatedAt: '2026-05-06' },
    ],
  },
  {
    group: 'Calendar & Booking',
    color: '#00BFFF',
    workflows: [
      { id: '5DYHvRiGznpfYToi', name: 'Calendar Slot Finder',  active: true,  trigger: 'Webhook', runs: 280, updatedAt: '2026-05-04' },
      { id: 'dsWkzzvQNLv87f0I', name: 'Check Availability',    active: true,  trigger: 'Sub-workflow', runs: null, updatedAt: '2026-05-06' },
      { id: 'GmCJVQwRoVwcnhFv', name: 'Book Event',            active: true,  trigger: 'Sub-workflow', runs: null, updatedAt: '2026-05-06' },
      { id: 'jhNcO2ELZXr09JYi', name: 'Lookup Appointment',    active: true,  trigger: 'Sub-workflow', runs: null, updatedAt: '2026-05-06' },
      { id: 'xZMhGXVZTdVHjFYg', name: 'Delete Appointment',    active: true,  trigger: 'Sub-workflow', runs: null, updatedAt: '2026-05-06' },
      { id: 'O9ZCKfhOQi42UoXI', name: 'Update Appointment',    active: true,  trigger: 'Sub-workflow', runs: null, updatedAt: '2026-05-06' },
    ],
  },
  {
    group: 'CRM & العملاء',
    color: '#10B981',
    workflows: [
      { id: '4XqKNGFoh9Zrwkuz', name: 'New Client CRM',                  active: true,  trigger: 'Sub-workflow', runs: null, updatedAt: '2026-05-05' },
      { id: 'HAoPClXp6TKD4AJQ', name: 'Client Lookup',                    active: true,  trigger: 'Sub-workflow', runs: null, updatedAt: '2026-05-06' },
      { id: 'cZSsBaQgQKXM9wVw', name: 'Hercules Receptionist EOC Report', active: true,  trigger: 'Manual',       runs: null, updatedAt: '2026-05-05' },
    ],
  },
  {
    group: 'WBOS — WhatsApp Booking System',
    color: '#F59E0B',
    workflows: [
      { id: 'ziFXfmOdX1LHu8Xs', name: 'WBOS — Core Booking Flow',            active: false, trigger: 'Webhook', runs: null, updatedAt: '2026-05-12', note: 'قيد التطوير' },
      { id: 'HewqaAv6D19XqMfL', name: 'WBOS — Appointment Reminder System',  active: false, trigger: 'Schedule (30m)', runs: null, updatedAt: '2026-05-12', note: 'قيد التطوير' },
      { id: 'UJCSPMgU7th4HHPs', name: 'WBOS — Post-Service Review Request',  active: false, trigger: 'Schedule (1h)',  runs: null, updatedAt: '2026-05-12', note: 'قيد التطوير' },
      { id: 'kxjAGgwUtB3ZpPL0', name: 'WBOS — No-Show Recovery System',      active: false, trigger: 'Schedule (2h)',  runs: null, updatedAt: '2026-05-12', note: 'قيد التطوير' },
    ],
  },
  {
    group: 'CW — حملات العملاء',
    color: '#EC4899',
    workflows: [
      { id: 'Sg5bPRkgSmLCGCJX', name: 'CW — Customer Entry & Welcome',   active: false, trigger: 'Supabase-owned', runs: null, updatedAt: '2026-06-01', note: 'منقول إلى Supabase' },
      { id: 'diBQsaD8c2BS4Jnq', name: 'CW — Weekly AI Promo',            active: false, trigger: 'Supabase-owned', runs: null, updatedAt: '2026-06-01', note: 'منقول إلى Supabase' },
      { id: 'S1DQdOUyxXx08aiC', name: 'CW — Daily Customer Reactivation', active: false, trigger: 'Supabase-owned', runs: null, updatedAt: '2026-06-01', note: 'منقول إلى Supabase' },
    ],
  },
]

const recentExecutions = [
  { id: '1928', workflow: 'Calendar Slot Finder', status: 'success', mode: 'webhook', startedAt: '2026-05-18T19:01:46Z', duration: '1.3s' },
  { id: '1927', workflow: 'Calendar Slot Finder', status: 'success', mode: 'webhook', startedAt: '2026-05-18T18:59:46Z', duration: '0.04s' },
  { id: '1926', workflow: 'Calendar Slot Finder', status: 'success', mode: 'webhook', startedAt: '2026-05-18T18:59:46Z', duration: '0.1s' },
  { id: '1925', workflow: 'Calendar Slot Finder', status: 'success', mode: 'webhook', startedAt: '2026-05-18T18:59:46Z', duration: '0.13s' },
  { id: '1924', workflow: 'Calendar Slot Finder', status: 'success', mode: 'webhook', startedAt: '2026-05-18T18:59:46Z', duration: '0.16s' },
  { id: '1923', workflow: 'Calendar Slot Finder', status: 'success', mode: 'webhook', startedAt: '2026-05-18T18:59:45Z', duration: '0.08s' },
  { id: '1921', workflow: 'Calendar Slot Finder', status: 'success', mode: 'webhook', startedAt: '2026-05-18T18:59:41Z', duration: '4.0s' },
  { id: '1912', workflow: 'Calendar Slot Finder', status: 'success', mode: 'webhook', startedAt: '2026-05-18T18:59:17Z', duration: '2.5s' },
]

const totalWorkflows = workflowGroups.reduce((a, g) => a + g.workflows.length, 0)
const activeCount = workflowGroups.reduce((a, g) => a + g.workflows.filter(w => w.active).length, 0)

export const AdminN8n = () => {
  const [tab, setTab] = useState<'workflows' | 'executions'>('workflows')

  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">n8n Workflows</div>
          <div className="sec-sub">بيانات حقيقية — أتمتة العمليات والتكاملات</div>
        </div>
        <a href="https://app.n8n.cloud" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          فتح n8n
        </a>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'إجمالي الـ Workflows', value: totalWorkflows, color: '#EA580C' },
          { label: 'نشطة الآن', value: activeCount, color: 'var(--green)' },
          { label: 'موقفة', value: totalWorkflows - activeCount, color: 'var(--ink-3)' },
          { label: 'إجمالي التشغيلات', value: '280+', color: 'var(--primary)' },
        ].map((k, i) => (
          <div key={i} className="stat">
            <div className="stat-top">
              <div className="stat-label">{k.label}</div>
            </div>
            <div className="stat-value" style={{ color: k.color !== 'var(--primary)' ? k.color : undefined }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="seg" style={{ marginBottom: 20 }}>
        <button className={tab === 'workflows' ? 'active' : ''} onClick={() => setTab('workflows')}>التدفقات</button>
        <button className={tab === 'executions' ? 'active' : ''} onClick={() => setTab('executions')}>سجل التشغيل (280)</button>
      </div>

      {tab === 'workflows' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {workflowGroups.map((group, gi) => (
            <div key={gi} className="card" style={{ overflow: 'hidden' }}>
              <div className="row gap-3 card-pad" style={{
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                background: group.color + '10',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: group.color }}>{group.group}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, color: group.color, background: group.color + '20', padding: '2px 8px', borderRadius: 99 }}>
                  {group.workflows.filter(w => w.active).length}/{group.workflows.length} نشط
                </span>
              </div>
              <table className="tbl">
                <tbody>
                  {group.workflows.map((w, wi) => (
                    <tr key={wi}>
                      <td style={{ width: 20, paddingInlineEnd: 8 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: w.active ? 'var(--green)' : 'var(--ink-4)',
                          boxShadow: w.active ? '0 0 6px var(--green)' : 'none',
                        }} />
                      </td>
                      <td style={{ fontWeight: 500 }}>{w.name}</td>
                      <td>
                        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 6 }}>
                          {w.trigger}
                        </span>
                      </td>
                      <td>
                        {(w as any).note && <span style={{ fontSize: 11, color: '#38BDF8' }}>{(w as any).note}</span>}
                        {w.runs && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{w.runs} تشغيلة</span>}
                      </td>
                      <td>
                        <span className={`badge ${w.active ? 'green' : 'gray'}`}>
                          {w.active ? 'نشط' : 'موقف'}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-4)' }}>
                        {w.id.slice(0, 8)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {tab === 'executions' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="row gap-3 card-pad" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>آخر التشغيلات الحقيقية</span>
            <span className="badge green" style={{ marginInlineStart: 'auto' }}>280 إجمالي</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>100% نجاح</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>الـ Workflow</th>
                <th>النوع</th>
                <th>المدة</th>
                <th>الوقت</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {recentExecutions.map(ex => (
                <tr key={ex.id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>#{ex.id}</td>
                  <td style={{ fontWeight: 500 }}>{ex.workflow}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{ex.mode}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{ex.duration}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{new Date(ex.startedAt).toLocaleTimeString('ar-SA')}</td>
                  <td><span className={`badge ${ex.status === 'success' ? 'green' : 'red'}`}>{ex.status === 'success' ? 'نجح' : 'فشل'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
