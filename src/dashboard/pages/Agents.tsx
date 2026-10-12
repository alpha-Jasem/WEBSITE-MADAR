import { useEffect, useMemo, useState } from 'react'
import { AudioLines, Bot, Check, Globe, Info, MessageCircle, Pause, Phone, Play } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Button } from '@/dashboard/components/primitives'
import { useToast, Skeleton } from '@/dashboard/components/uiExtras'
import {
  WEEK_DAYS, defaultAgentSettings, saveAgentSettings, syncKnowledgeToVoicePlatforms, useAgentLinks, useAgentSettings, useOpsCaps, webAgentUrl,
  type AgentChannels, type AgentSettings, type WorkingDay,
} from '@/lib/queries/ops'
import { useShellPrimaryAction } from '@/dashboard/components/shellActions'
import { useSearchParams } from 'react-router-dom'
import { TestCallDialog } from './agent/TestCallDialog'
import { relTime } from './tickets/ticketModel'
import './tickets/ops.css'

const VOICES = ['نسائي سعودي (نجدي)', 'رجالي سعودي (نجدي)', 'نسائي حجازي', 'رجالي حجازي']

const CHANNELS: { key: keyof AgentChannels; label: string; hint: string; icon: typeof Phone; voice?: boolean }[] = [
  { key: 'phone', label: 'المكالمات', hint: 'يرد على المكالمات الواردة', icon: Phone, voice: true },
  { key: 'whatsapp', label: 'واتساب', hint: 'يرد على رسائل الواتساب', icon: MessageCircle },
  { key: 'web', label: 'الموقع', hint: 'زر المحادثة في موقعك', icon: Globe },
]

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="ops-toggle" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />
}

export function DashboardV2Agents() {
  const { companyId, companyName, isDemo, hasModule, accountLoading } = useWorkspace()
  const pushToast = useToast()
  const { caps, ready } = useOpsCaps(isDemo, accountLoading)
  const canStore = isDemo || caps.agentSettings
  const { data: saved, loading, refetch } = useAgentSettings(companyId, isDemo, caps.agentSettings)
  const { data: links } = useAgentLinks(companyId, isDemo, caps.agentLinks)
  const hasVoice = hasModule('voice')

  const defaults = useMemo(() => defaultAgentSettings(companyId || 'demo-clinic-001', companyName), [companyId, companyName])
  const [draft, setDraft] = useState<AgentSettings>(defaults)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testOpen, setTestOpen] = useState(false)

  useEffect(() => {
    if (dirty) return
    setDraft(saved ? { ...saved, company_id: saved.company_id || defaults.company_id } : defaults)
  }, [saved, defaults, dirty])

  const testUrl = (links || []).map(webAgentUrl).find(Boolean) || null

  const edit = (patch: Partial<AgentSettings>) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true) }
  const editDay = (i: number, patch: Partial<WorkingDay>) => {
    setDraft((d) => ({ ...d, working_hours: d.working_hours.map((h, j) => (j === i ? { ...h, ...patch } : h)) }))
    setDirty(true)
  }

  async function persist(next: AgentSettings, okTitle: string) {
    if (!canStore) return
    setSaving(true)
    try {
      await saveAgentSettings(next, isDemo)
      setDirty(false)
      refetch()
      const sync = isDemo ? null : await syncKnowledgeToVoicePlatforms(next.company_id, 'settings')
      pushToast({
        kind: 'success', title: okTitle,
        description: isDemo ? undefined : sync?.synced ? 'وصلت التغييرات للوكيل.' : 'انحفظت، وتنطبق على الوكيل بعد ربطه بحسابك.',
      })
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  function togglePause() {
    const next = { ...draft, paused: !draft.paused }
    setDraft(next)
    persist(next, next.paused ? 'توقف الوكيل مؤقتًا' : 'رجع الوكيل يرد')
  }

  function testCall() {
    if (isDemo) { setTestOpen(true); return }
    if (testUrl) window.open(testUrl, '_blank', 'noopener,noreferrer')
    else pushToast({ kind: 'info', title: 'المعاينة تتفعّل بعد ربط الوكيل', description: 'اربط حسابك بمنصة الوكيل من صفحة التكاملات، وبعدها تقدر تجرّبه من هنا.' })
  }

  const name = draft.agent_name || 'الوكيل الذكي'

  useShellPrimaryAction({
    label: saving ? 'جارِ الحفظ...' : 'حفظ', icon: <Check />,
    onClick: () => persist(draft, 'انحفظت الإعدادات'), disabled: !canStore || saving || !dirty,
  })

  // ?test=1 (links into "معاينة الوكيل") opens the test call once the agent's links are known.
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('test') !== '1' || (!isDemo && caps.agentLinks && links == null)) return
    const next = new URLSearchParams(params)
    next.delete('test')
    setParams(next, { replace: true })
    if (isDemo) setTestOpen(true)
    else if (testUrl) window.open(testUrl, '_blank', 'noopener,noreferrer')
    else pushToast({ kind: 'info', title: 'المعاينة تتفعّل بعد ربط الوكيل', description: 'اربط حسابك بمنصة الوكيل من صفحة التكاملات، وبعدها تقدر تجرّبه من هنا.' })
  }, [params, setParams, isDemo, caps.agentLinks, links, testUrl, pushToast])

  return (
    <div className="ops-page">
      <div className="ops-head">
        <div>
          <h1 className="ops-h1">إعدادات الوكيل الذكي</h1>
          <p className="ops-sub">كيف يرد {name}، ومتى، ولمين يحوّل</p>
        </div>
        <div className="ops-actions">
          <Button variant="secondary" onClick={testCall}><AudioLines size={15} /> معاينة الوكيل</Button>
          <span className="shell-dup"><Button onClick={() => persist(draft, 'انحفظت الإعدادات')} disabled={!canStore || saving || !dirty}><Check size={15} /> {saving ? 'جارِ الحفظ...' : 'حفظ'}</Button></span>
        </div>
      </div>

      {ready && !canStore && (
        <div className="ops-note"><Info size={14} /><span>حفظ إعدادات الوكيل يتفعّل بعد تحديث قاعدة البيانات. تقدر تشوف الإعدادات الافتراضية الحين.</span></div>
      )}
      {canStore && !isDemo && (
        <div className="ops-note"><Info size={14} /><span>الإعدادات تنحفظ هنا، والتغييرات تنطبق على الوكيل بعد الربط.</span></div>
      )}

      <section className="ops-card ops-agent">
        <div className={`ops-orb${draft.paused ? ' off' : ''}`}><Bot size={26} /></div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text-primary)' }}>{name}</b><br />
          <span className="ops-status" style={{ color: draft.paused ? 'var(--warn)' : 'var(--ok)' }}>{draft.paused ? 'موقوف مؤقتًا' : 'مفعّل'}</span>
          {draft.updated_at && <span style={{ color: 'var(--dim)', fontSize: 12, marginInlineStart: 10 }}>آخر حفظ {relTime(draft.updated_at)}</span>}
        </div>
        {draft.paused
          ? <Button onClick={togglePause} disabled={!canStore || saving}><Play size={15} /> شغّله</Button>
          : <Button variant="danger" onClick={togglePause} disabled={!canStore || saving}><Pause size={15} /> إيقاف مؤقت</Button>}
      </section>

      {loading && caps.agentSettings && !isDemo ? (
        <Skeleton height={260} radius="16px" />
      ) : (
        <>
          <div className="ops-grid-2">
            <section className="ops-card">
              <h3>الشخصية والترحيب</h3>
              <div className="ops-form-grid">
                <div className="ops-field">
                  <label htmlFor="ag-name">اسم الوكيل</label>
                  <input className="ops-input" id="ag-name" value={draft.agent_name} onChange={(e) => edit({ agent_name: e.target.value })} />
                </div>
                <div className="ops-field">
                  <label htmlFor="ag-voice">الصوت</label>
                  <select className="ops-input" id="ag-voice" value={draft.voice_label} onChange={(e) => edit({ voice_label: e.target.value })}>
                    {(VOICES.includes(draft.voice_label) ? VOICES : [draft.voice_label, ...VOICES]).map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="ops-field" style={{ marginTop: 14 }}>
                <label htmlFor="ag-greet">جملة الترحيب</label>
                <textarea className="ops-input" id="ag-greet" value={draft.greeting} onChange={(e) => edit({ greeting: e.target.value })} />
              </div>
              <div className="ops-field" style={{ marginTop: 14 }}>
                <label htmlFor="ag-transfer">رقم التحويل لموظف</label>
                <input className="ops-input" id="ag-transfer" dir="ltr" inputMode="tel" style={{ textAlign: 'end' }} placeholder="05XXXXXXXX"
                  value={draft.transfer_number} onChange={(e) => edit({ transfer_number: e.target.value })} />
              </div>
            </section>

            <section className="ops-card">
              <h3>القنوات</h3>
              {CHANNELS.filter((c) => hasVoice || !c.voice).map(({ key, label, hint, icon: Icon }) => (
                <div key={key} className="ops-row-line">
                  <Icon size={17} style={{ color: 'var(--sky)', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{label}</b>
                    <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{hint}</div>
                  </div>
                  <Toggle checked={!!draft.channels[key]} label={label} onChange={(v) => edit({ channels: { ...draft.channels, [key]: v } })} />
                </div>
              ))}
              <h3 style={{ marginTop: 18 }}>خارج الدوام</h3>
              <div className="ops-seg" role="group" aria-label="خارج الدوام">
                {([['take', 'يرد ويسجل الطلب'], ['message', 'يعتذر ويقول الدوام']] as const).map(([k, l]) => (
                  <button key={k} type="button" aria-pressed={draft.after_hours_mode === k} onClick={() => edit({ after_hours_mode: k })}>{l}</button>
                ))}
              </div>
            </section>
          </div>

          <section className="ops-card">
            <h3>ساعات العمل</h3>
            <div className="ops-hours">
              {draft.working_hours.map((h, i) => (
                <div key={h.day} className="ops-hour-row">
                  <b>{WEEK_DAYS[h.day] ?? WEEK_DAYS[i]}</b>
                  <Toggle checked={h.open} label={WEEK_DAYS[h.day] ?? ''} onChange={(v) => editDay(i, v ? { open: true, from: h.from || '09:00', to: h.to || '21:00' } : { open: false })} />
                  {h.open ? (
                    <>
                      <input className="ops-input sm" type="time" dir="ltr" aria-label="من" value={h.from} onChange={(e) => editDay(i, { from: e.target.value })} />
                      <input className="ops-input sm" type="time" dir="ltr" aria-label="إلى" value={h.to} onChange={(e) => editDay(i, { to: e.target.value })} />
                    </>
                  ) : <span className="closed">مغلق</span>}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <TestCallDialog open={testOpen} onClose={() => setTestOpen(false)} agentName={name} />
    </div>
  )
}
