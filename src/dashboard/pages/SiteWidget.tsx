import { useEffect, useRef, useState } from 'react'
import { Copy, MessageCircle } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Card, Button, Input } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, EmptyLine, Seg, Toggle } from './shared/night'
import { useSiteWidget, embedSnippet, DEFAULT_WIDGET, type SiteWidget } from '@/lib/queries/siteWidget'

const CSS = `
.sw-grid { display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 18px; align-items: start; }
.sw-col { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.sw-form { display: flex; flex-direction: column; gap: 14px; }
.sw-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sw-row b { font-size: 14px; font-weight: 600; color: var(--ink); display: block; }
.sw-row small { color: var(--muted); font-size: 12.5px; }
.sw-colors { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.sw-color { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
.sw-color[aria-pressed="true"] { border-color: var(--ink); }
.sw-color:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.sw-label { font-size: 13px; color: var(--muted); margin-bottom: 6px; display: block; }
.sw-code { direction: ltr; text-align: left; background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px; padding: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.7; white-space: pre-wrap; word-break: break-all; color: var(--ink); }
.sw-stage { position: sticky; top: 76px; background: #e9ebf0; border-radius: 16px; height: 560px; overflow: hidden; border: 1px solid var(--line); }
.sw-site { position: absolute; inset: 0; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.sw-site i { display: block; height: 12px; border-radius: 6px; background: #d3d6de; }
.sw-chat { position: absolute; bottom: 84px; width: 330px; max-width: calc(100% - 28px); height: 400px; border-radius: 16px; overflow: hidden; box-shadow: 0 18px 50px rgba(0,0,0,.35); border: 1px solid #2a2a33; background: #0f0f12; }
.sw-chat iframe { width: 100%; height: 100%; border: 0; display: block; }
.sw-fab { position: absolute; bottom: 18px; width: 56px; height: 56px; border-radius: 50%; border: 0; color: #fff; display: grid; place-items: center; box-shadow: 0 10px 30px rgba(0,0,0,.3); cursor: pointer; }
@media (max-width: 1000px) { .sw-grid { grid-template-columns: 1fr; } .sw-stage { position: static; height: 520px; } }
`

const COLORS = ['#4f6bff', '#8053f8', '#0ea5a4', '#16a34a', '#f59e0b', '#e11d48', '#111827']

export function DashboardV2SiteWidget() {
  const { companyId, isDemo, isOwner, can } = useWorkspace()
  const pushToast = useToast()
  const { data, loading, available, save } = useSiteWidget(companyId, isDemo)
  const [draft, setDraft] = useState<SiteWidget>(DEFAULT_WIDGET)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(true)
  const frame = useRef<HTMLIFrameElement>(null)
  const canEdit = isOwner || isDemo || can('integrations.manage')

  useEffect(() => { if (!dirty && data) setDraft(data) }, [data, dirty])

  // Live preview: send every edit to the chat frame.
  const push = () => frame.current?.contentWindow?.postMessage({ type: 'madar-preview', config: draft }, '*')
  useEffect(push, [draft, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (patch: Partial<SiteWidget>) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true) }
  const setChip = (i: number, v: string) => edit({ chips: draft.chips.map((c, j) => (j === i ? v : c)) })

  async function onSave(overrides: Partial<SiteWidget> = {}) {
    setSaving(true)
    try {
      const saved = await save({ ...draft, ...overrides })
      setDraft(saved); setDirty(false)
      pushToast({ kind: 'success', title: 'انحفظت إعدادات الودجت' })
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined })
    } finally { setSaving(false) }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(embedSnippet(draft.public_key)); pushToast({ kind: 'success', title: 'انسخ الكود' }) }
    catch { pushToast({ kind: 'danger', title: 'ما قدرنا ننسخ، حدده وانسخه بنفسك' }) }
  }

  const side = draft.position === 'left' ? { left: 18 } : { right: 18 }
  const hasKey = !!draft.public_key

  return (
    <NightPage>
      <style>{CSS}</style>
      <PageHead
        title="ودجت الموقع" sub="محادثة على موقعك يرد فيها الوكيل على زوارك من معلومات شركتك، وتوصلك المحادثات في صفحة المحادثات"
        actions={canEdit ? <Button disabled={saving || !dirty} onClick={() => void onSave()}>{saving ? 'جارِ الحفظ...' : 'حفظ'}</Button> : undefined}
      />
      {!available && <Card><EmptyLine>الودجت غير مفعّل على هذا الحساب بعد.</EmptyLine></Card>}
      {available && (loading ? <Card><EmptyLine>جارِ التحميل...</EmptyLine></Card> : (
        <div className="sw-grid">
          <div className="sw-col">
            <Card>
              <CardTitle>الشكل</CardTitle>
              <div className="sw-form">
                <Input label="العنوان" value={draft.title} onChange={(e) => edit({ title: e.target.value })} />
                <Input label="رسالة الترحيب" value={draft.greeting} onChange={(e) => edit({ greeting: e.target.value })} />
                <div>
                  <span className="sw-label">اللون</span>
                  <div className="sw-colors">
                    {COLORS.map((c) => (
                      <button key={c} type="button" className="sw-color" aria-label={`اللون ${c}`} aria-pressed={draft.color.toLowerCase() === c} style={{ background: c }} onClick={() => edit({ color: c })} />
                    ))}
                    <input type="color" aria-label="لون مخصص" value={/^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : '#4f6bff'} onChange={(e) => edit({ color: e.target.value })} style={{ width: 34, height: 30, border: 0, background: 'none', padding: 0, cursor: 'pointer' }} />
                  </div>
                </div>
                <Seg label="مكان الزر" value={draft.position} onChange={(v: 'right' | 'left') => edit({ position: v })} options={[['right', 'يمين'], ['left', 'يسار']] as const} />
                <Input label="رابط الشعار (اختياري، https)" placeholder="https://..." value={draft.logo_url} onChange={(e) => edit({ logo_url: e.target.value })} />
              </div>
            </Card>
            <Card>
              <CardTitle aside="حتى 4 أزرار سريعة يضغطها الزائر">ردود سريعة</CardTitle>
              <div className="sw-form">
                {[0, 1, 2, 3].map((i) => (
                  <Input key={i} placeholder={`رد سريع ${i + 1}`} value={draft.chips[i] || ''} onChange={(e) => setChip(i, e.target.value)} />
                ))}
              </div>
            </Card>
            <Card>
              <CardTitle>التركيب على موقعك</CardTitle>
              <div className="sw-form">
                <div className="sw-row">
                  <div><b>تشغيل الودجت</b><small>{draft.enabled ? 'يظهر لزوار موقعك' : 'مطفأ، ما يظهر لأحد'}</small></div>
                  {canEdit && <Toggle checked={draft.enabled} label="تشغيل الودجت" disabled={saving} onChange={(v) => { edit({ enabled: v }); void onSave({ enabled: v }) }} />}
                </div>
                {hasKey ? (
                  <>
                    <small style={{ color: 'var(--muted)', lineHeight: 1.8 }}>انسخ السطر وألصقه في صفحات موقعك قبل إغلاق وسم body.</small>
                    <div className="sw-code">{embedSnippet(draft.public_key)}</div>
                    <div><Button variant="secondary" onClick={() => void copy()}><Copy size={14} /> نسخ الكود</Button></div>
                  </>
                ) : (
                  <small style={{ color: 'var(--muted)', lineHeight: 1.8 }}>احفظ الإعدادات أول مرة ويظهر لك كود التركيب.</small>
                )}
              </div>
            </Card>
          </div>

          <div className="sw-col">
            <div className="sw-stage" aria-label="معاينة حية">
              <div className="sw-site" aria-hidden="true"><i style={{ width: '40%' }} /><i style={{ width: '90%' }} /><i style={{ width: '75%' }} /><i style={{ width: '85%' }} /></div>
              {open && (
                <div className="sw-chat" style={side}>
                  <iframe ref={frame} title="معاينة المحادثة" src="/widget/chat.html?preview=1" onLoad={push} />
                </div>
              )}
              <button type="button" className="sw-fab" style={{ ...side, background: draft.color }} aria-label={open ? 'إخفاء المحادثة' : 'عرض المحادثة'} aria-expanded={open} onClick={() => setOpen((v) => !v)}><MessageCircle size={26} /></button>
            </div>
          </div>
        </div>
      ))}
    </NightPage>
  )
}
