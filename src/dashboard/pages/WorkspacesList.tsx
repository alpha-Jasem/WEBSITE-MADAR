import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Copy, Pencil, Plus, Search, Settings, Trash2, UserPlus, Users, Bot, Sparkles } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { updateCompany } from '@/lib/dashboardQueries'
import { CLINIC_PLANS } from '@/lib/clinicOSProduct'
import { Button, Dialog, Input } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { NightPage } from './shared/night'
import { WorkspaceAvatar } from '@/dashboard/components/WorkspaceAvatar'

// مساحات عملي: the workspaces the signed-in person belongs to, each with its members, invite, rename and delete actions.
// A Madar account has one workspace today; a new one or a deletion goes to the team as a support request.

const CSS = `
.wl { display: grid; gap: 16px; max-width: 1240px; margin: 0 auto; width: 100%; }
.wl-box { border: 1px solid var(--line); border-radius: 18px; background: var(--panel); padding: 20px 22px; }
.wl-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
.wl-head h1 { margin: 0; font-size: 26px; font-weight: 800; color: var(--ink); } .wl-head p { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.wl-search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 12px; padding: 0 12px; height: 42px; background: var(--surface-input); max-width: 520px; }
.wl-search input { border: 0 !important; background: transparent !important; outline: none; flex: 1; font: inherit; font-size: 13.5px; color: var(--ink); height: 40px; padding: 0 !important; }
.wl-search svg { color: var(--dim); flex: none; }
.wl-list-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; } .wl-list-h b { font-size: 15px; color: var(--ink); }
.wl-count { min-width: 24px; height: 24px; border-radius: 99px; border: 1px solid var(--line); display: grid; place-items: center; font-size: 12px; color: var(--muted); }
.wl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 520px), 1fr)); gap: 14px; }
.wl-card { border: 1px solid var(--line); border-radius: 16px; background: var(--panel); overflow: hidden; display: grid; }
.wl-top { display: flex; gap: 14px; padding: 18px 18px 14px; align-items: flex-start; }
.wl-av { width: 54px; height: 54px; border-radius: 14px; flex: none; background: var(--gradient-brand); }
.wl-info { flex: 1; min-width: 0; display: grid; gap: 6px; }
.wl-info h3 { margin: 0; font-size: 17px; font-weight: 800; color: var(--ink); }
.wl-meta { font-size: 12.5px; color: var(--muted); overflow-wrap: anywhere; } .wl-meta b { color: var(--ink); font-weight: 600; }
.wl-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.wl-tag { display: inline-flex; gap: 5px; align-items: center; font-size: 12px; padding: 3px 10px; border-radius: 99px; border: 1px solid var(--line); color: var(--ink); background: var(--panel-2); }
.wl-open { width: 36px; height: 36px; border-radius: 10px; border: 0; background: none; color: var(--muted); cursor: pointer; display: grid; place-items: center; flex: none; } .wl-open:hover { background: var(--hover-bg); color: var(--ink); }
.wl-id { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); direction: ltr; }
.wl-id button { border: 0; background: none; color: var(--dim); cursor: pointer; padding: 2px; display: inline-grid; } .wl-id button:hover { color: var(--ink); }
.wl-actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--line); background: var(--panel-2); }
.wl-act { display: inline-flex; gap: 6px; align-items: center; height: 32px; padding: 0 12px; border-radius: 9px; border: 1px solid var(--line-2); background: var(--panel); color: var(--ink); font: inherit; font-size: 12.5px; cursor: pointer; }
.wl-act:hover { background: var(--hover-bg); } .wl-act.danger { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 45%, transparent); }
.wl-act:focus-visible, .wl-open:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
.wl-empty { color: var(--muted); font-size: 13.5px; padding: 24px; text-align: center; }
`

const nf = new Intl.NumberFormat('en-US')
const shortDate = (iso: string | null) => (iso ? iso.slice(0, 10).replace(/-/g, '/') : '—')

export function DashboardV2Workspaces() {
  const { companyId, companyName, companyEmail, isDemo, isOwner, packageType, refreshAccount } = useWorkspace()
  const navigate = useNavigate()
  const pushToast = useToast()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const [q, setQ] = useState('')
  const [agents, setAgents] = useState<number | null>(null)
  const [updated, setUpdated] = useState<string | null>(null)
  const [rename, setRename] = useState<{ open: boolean; name: string; busy: boolean }>({ open: false, name: '', busy: false })
  const [del, setDel] = useState(false)

  useEffect(() => {
    if (isDemo || !companyId) return
    let live = true
    void supabase.from('agent_links').select('agent_id', { count: 'exact', head: true }).eq('company_id', companyId)
      .then(({ count }) => { if (live) setAgents(count ?? 0) })
    void supabase.from('companies').select('updated_at').eq('id', companyId).maybeSingle()
      .then(({ data }) => { if (live) setUpdated((data as { updated_at?: string } | null)?.updated_at ?? null) })
    return () => { live = false }
  }, [isDemo, companyId])

  const list = useMemo(() => {
    const id = companyId ?? ''
    const ws = [{ id, name: companyName || 'مساحة العمل', owner: companyEmail || '—' }]
    const t = q.trim().toLowerCase()
    return t ? ws.filter((w) => w.name.toLowerCase().includes(t) || w.id.toLowerCase().includes(t)) : ws
  }, [companyId, companyName, companyEmail, q])

  // The demo has no rows to count, so it shows sample values.
  const agentCount = isDemo ? 3 : agents
  const updatedAt = isDemo ? '2026-11-20' : updated
  const plan = CLINIC_PLANS[packageType]?.name || ''

  async function copyId(id: string) {
    try { await navigator.clipboard.writeText(id); pushToast({ kind: 'success', title: 'نُسخ معرّف مساحة العمل' }) }
    catch { pushToast({ kind: 'danger', title: 'ما قدرنا ننسخ', description: id }) }
  }

  async function saveName() {
    const name = rename.name.trim()
    if (!name) return
    setRename((r) => ({ ...r, busy: true }))
    try {
      if (!isDemo && companyId) { await updateCompany(companyId, { name }); await refreshAccount() }
      setRename({ open: false, name: '', busy: false })
      pushToast({ kind: 'success', title: 'تغيّر اسم مساحة العمل' })
    } catch (e) {
      setRename((r) => ({ ...r, busy: false }))
      pushToast({ kind: 'danger', title: 'ما انحفظ الاسم', description: e instanceof Error ? e.message : undefined })
    }
  }

  const request = (subject: string) => navigate(`${base}/help/new?kind=billing&subject=${encodeURIComponent(subject)}`)

  return (
    <NightPage>
      <style>{CSS}</style>
      <div className="wl">
        <section className="wl-box wl-head">
          <div><h1>مساحات عملي</h1><p>{list.length} مساحة عمل</p></div>
          <Button onClick={() => request('طلب إنشاء مساحة عمل جديدة')}><Plus size={15} /> إنشاء مساحة عمل</Button>
        </section>

        <section className="wl-box">
          <label className="wl-search"><Search size={16} aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في مساحات العمل بالاسم أو معرّف مساحة العمل..." aria-label="بحث في مساحات العمل" />
          </label>
        </section>

        <section className="wl-box">
          <div className="wl-list-h"><b>مساحات عملك</b><span className="wl-count">{list.length}</span></div>
          {list.length === 0 ? <div className="wl-empty">لا توجد مساحة عمل بهذا الاسم.</div> : (
            <div className="wl-grid">
              {list.map((w) => (
                <article key={w.id || 'ws'} className="wl-card" aria-label={`مساحة العمل ${w.name}`}>
                  <div className="wl-top">
                    <WorkspaceAvatar name={w.name} size={54} />
                    <div className="wl-info">
                      <h3>{w.name}</h3>
                      <div className="wl-meta"><b>المالك:</b> {w.owner}</div>
                      <div className="wl-tags">
                        {plan && <span className="wl-tag"><Sparkles size={13} />{plan}</span>}
                        <span className="wl-tag"><Bot size={13} />{agentCount == null ? '…' : `${nf.format(agentCount)} الوكلاء`}</span>
                      </div>
                      <div className="wl-meta">
                        <b>معرّف مساحة العمل:</b> <span className="wl-id">{w.id ? `${w.id.slice(0, 8)}…` : '—'}{w.id && <button type="button" aria-label="نسخ المعرّف" onClick={() => void copyId(w.id)}><Copy size={13} /></button>}</span>
                        {' · '}<b>آخر تحديث:</b> {shortDate(updatedAt)}
                      </div>
                    </div>
                    <button type="button" className="wl-open" aria-label="فتح مساحة العمل" onClick={() => navigate(base)}><ChevronLeft size={18} /></button>
                  </div>
                  <div className="wl-actions">
                    <button type="button" className="wl-act" onClick={() => navigate(`${base}/team`)}><Users size={14} /> الأعضاء</button>
                    <button type="button" className="wl-act" onClick={() => navigate(`${base}/team?invite=1`)}><UserPlus size={14} /> دعوة</button>
                    {(isOwner || isDemo) && <button type="button" className="wl-act" onClick={() => setRename({ open: true, name: w.name, busy: false })}><Pencil size={14} /> تعديل</button>}
                    <button type="button" className="wl-act" onClick={() => navigate(`${base}/workspace-settings`)}><Settings size={14} /> الإعدادات</button>
                    {(isOwner || isDemo) && <button type="button" className="wl-act danger" onClick={() => setDel(true)}><Trash2 size={14} /> حذف</button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={rename.open} title="تعديل مساحة العمل" onClose={() => setRename({ open: false, name: '', busy: false })}
        footer={<><Button variant="ghost" onClick={() => setRename({ open: false, name: '', busy: false })}>إلغاء</Button><Button disabled={rename.busy || !rename.name.trim()} onClick={() => void saveName()}>حفظ</Button></>}>
        <Input label="اسم مساحة العمل" value={rename.name} onChange={(e) => setRename((r) => ({ ...r, name: e.target.value }))} />
      </Dialog>

      <Dialog open={del} title="حذف مساحة العمل" onClose={() => setDel(false)}
        footer={<><Button variant="ghost" onClick={() => setDel(false)}>إلغاء</Button><Button variant="danger" onClick={() => { setDel(false); request('طلب حذف مساحة العمل') }}>متابعة طلب الحذف</Button></>}>
        <p style={{ margin: 0, lineHeight: 1.8, color: 'var(--muted)', fontSize: 14 }}>
          حذف مساحة العمل يمسح وكلاءها ومحادثاتها وبياناتها نهائيًا ولا يمكن التراجع عنه. لحمايتك، يتم الحذف عبر فريق مدار بعد التأكد منك: سنفتح لك طلبًا للفريق.
        </p>
      </Dialog>
    </NightPage>
  )
}
