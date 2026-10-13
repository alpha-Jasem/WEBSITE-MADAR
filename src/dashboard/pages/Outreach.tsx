import { useMemo, useState } from 'react'
import { Send, Plus, Trash2, Pencil, Info, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useCustomers } from '@/lib/dashboardQueries'
import { useConversationData } from '@/lib/queries/conversations'
import {
  deleteWaTemplate, fillTemplate, placeholderCount, saveWaTemplate, sendOutreach, useOutreachLog, useWaTemplates,
  type SendResult, type WaTemplate,
} from '@/lib/queries/outreach'
import { buildContacts } from './AgentUsers'
import { Card, Badge, Button, Dialog, Input, Select } from '@/dashboard/components/primitives'
import { NightPage, PageHead, CardTitle } from './shared/night'
import { EmptyState, useToast } from '@/dashboard/components/uiExtras'
import { fmtWhen } from './conversations/model'

interface Person { key: string; name: string; phone: string }

const LANGS = [{ value: 'ar', label: 'العربية (ar)' }, { value: 'en', label: 'الإنجليزية (en)' }, { value: 'en_US', label: 'English US (en_US)' }]

/** Outreach: Meta-approved WhatsApp templates and sending them to customers. */
export function DashboardV2Outreach() {
  const { companyId, isDemo, userName } = useWorkspace()
  const pushToast = useToast()
  const { templates, available } = useWaTemplates(companyId, isDemo)
  const log = useOutreachLog(companyId, isDemo)
  const { data: customers } = useCustomers(companyId, isDemo)
  const { calls } = useConversationData(companyId, isDemo)

  const [editing, setEditing] = useState<Partial<WaTemplate> | null>(null)
  const [tplId, setTplId] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [manual, setManual] = useState('')
  const [values, setValues] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [results, setResults] = useState<SendResult[] | null>(null)

  const tpl = templates.find((t) => t.id === tplId) || null

  const people = useMemo<Person[]>(() => {
    const out = new Map<string, Person>()
    for (const c of customers || []) if (c.phone) out.set(c.phone.replace(/\D/g, ''), { key: c.phone.replace(/\D/g, ''), name: c.name, phone: c.phone })
    for (const c of buildContacts(calls || [])) {
      if (!c.phone) continue
      const k = c.phone.replace(/\D/g, '')
      if (!out.has(k)) out.set(k, { key: k, name: c.name !== c.phone ? c.name : '', phone: c.phone })
    }
    return [...out.values()]
  }, [customers, calls])

  const typed = useMemo(() => manual.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [a, b] = l.split(/[,،\t]/).map((x) => x.trim())
    return b ? { name: a, phone: b } : { name: '', phone: a }
  }), [manual])

  const recipients = useMemo(() => {
    const chosen = people.filter((p) => picked.has(p.key)).map((p) => ({ name: p.name, phone: p.phone }))
    return [...chosen, ...typed]
  }, [people, picked, typed])

  function startTemplate(t: WaTemplate | null) {
    setEditing(t ? { ...t } : { language: 'ar', name: '', label: '', body: '', param_labels: [] })
  }

  async function submitTemplate() {
    if (!editing) return
    const body = (editing.body || '').trim()
    const n = placeholderCount(body)
    const labels = Array.from({ length: n }, (_, i) => (editing.param_labels?.[i] || `قيمة ${i + 1}`))
    if (!editing.label?.trim() || !editing.name?.trim() || !body) { pushToast({ kind: 'danger', title: 'اكتب الاسم واسم القالب في Meta ونصه' }); return }
    if (!/^[a-z0-9_]+$/.test(editing.name.trim())) { pushToast({ kind: 'danger', title: 'اسم القالب في Meta حروف إنجليزية صغيرة وأرقام و _ فقط' }); return }
    setBusy(true)
    try {
      await saveWaTemplate(companyId, isDemo, { id: editing.id, name: editing.name!, language: editing.language || 'ar', label: editing.label!, body, param_labels: labels })
      pushToast({ kind: 'success', title: 'انحفظ القالب' })
      setEditing(null)
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error && e.message.includes('duplicate') ? 'يوجد قالب بنفس الاسم واللغة.' : undefined })
    } finally { setBusy(false) }
  }

  const valueFor = (name: string) => (tpl?.param_labels || []).map((_, i) => (values[i] || '').replaceAll('{name}', name || ''))
  const payload = () => recipients.map((r) => ({ phone: r.phone, name: r.name, params: valueFor(r.name) }))
  const ready = !!tpl && recipients.length > 0 && (tpl.param_labels || []).every((_, i) => (values[i] || '').trim())

  async function run(dryRun: boolean) {
    if (!tpl) return
    setBusy(true)
    try {
      const out = await sendOutreach(isDemo, tpl, payload(), { dryRun, sentBy: userName || undefined })
      setResults(out.results)
      if (!dryRun) {
        const sent = out.results.filter((r) => r.status === 'sent').length
        pushToast({ kind: sent === out.results.length ? 'success' : 'info', title: `أُرسلت ${sent} من ${out.results.length}`, description: isDemo ? 'عرض تجريبي: ما أُرسل شيء فعليًا.' : undefined })
        setPicked(new Set()); setManual('')
      }
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الإرسال', description: e instanceof Error ? e.message : undefined })
    } finally { setBusy(false); setConfirmOpen(false) }
  }

  const preview = tpl ? fillTemplate(tpl.body, valueFor(recipients[0]?.name || 'اسم العميل')) : ''

  return (
    <NightPage>
      <PageHead title="الرسائل الصادرة" sub="أرسل رسائل واتساب لعملائك بقوالب معتمدة من Meta، من نفس رقم الوكيل" />

      <Card style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={16} style={{ marginTop: 3, flex: 'none' }} />
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          واتساب يسمح لك تبدأ المحادثة مع العميل <b>بقالب معتمد من Meta فقط</b>. أنشئ القالب في Meta (WhatsApp Manager) وانتظر اعتماده،
          ثم سجّل هنا اسمه بنفس الحروف. أرسل فقط لمن وافق على استقبال رسائلك. أول ما يرد العميل، يكمل معه الوكيل تلقائيًا.
        </div>
      </Card>

      {!available && <Card style={{ padding: 16 }}><div className="nx-empty">الرسائل الصادرة تتفعّل بعد تحديث قاعدة البيانات.</div></Card>}

      {available && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <CardTitle aside={<Button size="sm" onClick={() => startTemplate(null)}><Plus size={14} /> قالب جديد</Button>}>القوالب</CardTitle>
            {templates.length === 0 ? (
              <EmptyState icon={<Send size={20} />} title="ما سجّلت أي قالب" description="أضف اسم قالب معتمد من Meta ونصه عشان تقدر ترسل به." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templates.map((t) => (
                  <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, border: '1px solid var(--border-default)', borderRadius: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontWeight: 600 }}>{t.label} <Badge tone="neutral">{t.language}</Badge></div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }} dir="ltr">{t.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>{t.body}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => startTemplate(t)} aria-label="تعديل"><Pencil size={13} /></Button>
                    <Button size="sm" variant="secondary" aria-label="حذف" onClick={() => void deleteWaTemplate(companyId, isDemo, t.id).then(() => { if (tplId === t.id) setTplId('') })}><Trash2 size={13} /></Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <CardTitle>إرسال</CardTitle>
            {templates.length === 0 ? <div className="nx-empty">سجّل قالبًا أولًا.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Select label="القالب" value={tplId} onChange={(e) => { setTplId(e.target.value); setValues([]); setResults(null) }}
                  options={[{ value: '', label: 'اختر قالبًا…' }, ...templates.map((t) => ({ value: t.id, label: t.label }))]} />

                {tpl && (tpl.param_labels || []).map((l, i) => (
                  <Input key={i} label={l} value={values[i] || ''} onChange={(e) => setValues((v) => { const n = [...v]; n[i] = e.target.value; return n })}
                    placeholder={i === 0 ? 'اكتب {name} لاسم كل عميل' : ''} />
                ))}

                {tpl && (
                  <div style={{ padding: 12, borderRadius: 10, background: 'var(--surface-sunken, rgba(127,127,127,.08))', fontSize: 13, lineHeight: 1.8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>معاينة</div>{preview}
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>المستلمون ({recipients.length})</div>
                  {people.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, maxHeight: 130, overflowY: 'auto' }}>
                      {people.map((p) => (
                        <button key={p.key} type="button" aria-pressed={picked.has(p.key)}
                          onClick={() => setPicked((s) => { const n = new Set(s); n.has(p.key) ? n.delete(p.key) : n.add(p.key); return n })}
                          style={{ padding: '4px 10px', borderRadius: 99, border: '1px solid var(--border-default)', background: picked.has(p.key) ? 'var(--brand-600, #2563eb)' : 'transparent',
                            color: picked.has(p.key) ? '#fff' : 'inherit', fontSize: 12.5, cursor: 'pointer' }}>
                          {p.name || p.phone}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea className="nx-input" rows={3} value={manual} onChange={(e) => setManual(e.target.value)} aria-label="أرقام إضافية"
                    placeholder={'أرقام إضافية، رقم في كل سطر (أو: الاسم، الرقم)\n0501234567\nمحمد، 0551234567'} style={{ width: '100%', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button variant="secondary" disabled={!ready || busy} onClick={() => void run(true)}><CheckCircle2 size={14} /> فحص بدون إرسال</Button>
                  <Button disabled={!ready || busy} onClick={() => setConfirmOpen(true)}><Send size={14} /> إرسال</Button>
                </div>

                {results && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
                    {results.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {r.status === 'sent' || r.status === 'ready' ? <CheckCircle2 size={14} color="#16a34a" /> : <AlertTriangle size={14} color="#dc2626" />}
                        <span dir="ltr">{r.phone}</span>
                        <span>{r.status === 'sent' ? 'أُرسلت' : r.status === 'ready' ? 'جاهزة' : r.error || 'فشلت'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>آخر الرسائل المرسلة</CardTitle>
            {log.length === 0 ? <div className="nx-empty">ما أرسلت شيء بعد.</div> : (
              <div className="np-table-wrap">
                <table className="np-table" style={{ minWidth: 560 }}>
                  <thead><tr><th>العميل</th><th>الرقم</th><th>القالب</th><th>الحالة</th><th>الوقت</th></tr></thead>
                  <tbody>
                    {log.map((r) => (
                      <tr key={r.id}>
                        <td>{r.recipient_name || '—'}</td>
                        <td dir="ltr" className="np-num" style={{ textAlign: 'end' }}>{r.to_phone}</td>
                        <td>{r.template_label || r.template_name}</td>
                        <td><Badge tone={r.status === 'sent' ? 'success' : 'danger'}>{r.status === 'sent' ? 'أُرسلت' : 'فشلت'}</Badge>{r.error && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 260 }}>{r.error}</div>}</td>
                        <td>{fmtWhen(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Dialog open={!!editing} title={editing?.id ? 'تعديل القالب' : 'قالب جديد'} onClose={() => setEditing(null)}
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>إلغاء</Button><Button onClick={submitTemplate} disabled={busy}>حفظ</Button></>}>
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="اسم تعريفي" placeholder="مثل: تذكير بزيارة" value={editing.label || ''} onChange={(e) => setEditing((x) => ({ ...x, label: e.target.value }))} />
            <Input label="اسم القالب في Meta (بالحرف)" placeholder="visit_reminder" dir="ltr" value={editing.name || ''} onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))} />
            <Select label="اللغة" value={editing.language || 'ar'} options={LANGS} onChange={(e) => setEditing((x) => ({ ...x, language: e.target.value }))} />
            <label className="nx-field">
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>نص القالب (استخدم {'{{1}}'} و {'{{2}}'} للقيم المتغيرة)</span>
              <textarea className="nx-input" rows={4} value={editing.body || ''} style={{ width: '100%', marginTop: 6 }}
                onChange={(e) => setEditing((x) => ({ ...x, body: e.target.value }))} />
            </label>
            {Array.from({ length: placeholderCount(editing.body || '') }, (_, i) => (
              <Input key={i} label={`اسم القيمة {{${i + 1}}}`} value={editing.param_labels?.[i] || ''}
                onChange={(e) => setEditing((x) => { const l = [...(x?.param_labels || [])]; l[i] = e.target.value; return { ...x, param_labels: l } })} />
            ))}
          </div>
        )}
      </Dialog>

      <Dialog open={confirmOpen} title="تأكيد الإرسال" onClose={() => setConfirmOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setConfirmOpen(false)}>إلغاء</Button><Button onClick={() => void run(false)} disabled={busy}>{busy ? 'جارِ الإرسال…' : 'أرسل الآن'}</Button></>}>
        <div style={{ fontSize: 13.5, lineHeight: 1.9 }}>
          بترسل «{tpl?.label}» إلى <b>{recipients.length}</b> رقم من رقم الوكيل. الرسالة تطلع للعملاء فعليًا ولا يمكن التراجع عنها.
          <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'var(--surface-sunken, rgba(127,127,127,.08))' }}>{preview}</div>
        </div>
      </Dialog>
    </NightPage>
  )
}
