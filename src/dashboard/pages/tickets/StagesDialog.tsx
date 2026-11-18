import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button, Dialog } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { saveTicketStages, type TicketStage } from '@/lib/queries/ops'
import type { TicketStatus } from '@/types/dashboard'
import { STATUS } from './ticketModel'

type Row = Omit<TicketStage, 'id'> & { id?: string }

/** A starting point when the company has no stages yet: the three statuses, plus one example in between. */
const STARTER: Row[] = [
  { name: 'جديدة', status: 'open', position: 0, color: null },
  { name: 'قيد المعالجة', status: 'in_progress', position: 1, color: null },
  { name: 'بانتظار العميل', status: 'in_progress', position: 2, color: null },
  { name: 'محلولة', status: 'resolved', position: 3, color: null },
]

/** Edits the board's columns. Each column belongs to a status so reports and automations keep working. */
export function StagesDialog({ open, onClose, stages, companyId, isDemo }: {
  open: boolean
  onClose: () => void
  stages: TicketStage[]
  companyId: string | null
  isDemo: boolean
}) {
  const pushToast = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setRows(stages.length ? stages.map((s) => ({ ...s })) : STARTER.map((s) => ({ ...s }))) }, [open, stages])

  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i: number, d: -1 | 1) => setRows((r) => {
    const j = i + d
    if (j < 0 || j >= r.length) return r
    const next = [...r]; [next[i], next[j]] = [next[j], next[i]]; return next
  })

  async function save(list: Row[]) {
    if (!companyId) return
    const named = list.filter((r) => r.name.trim())
    if (named.length) {
      const missing = (['open', 'in_progress', 'resolved'] as TicketStatus[]).filter((s) => !named.some((r) => r.status === s))
      if (missing.length) { pushToast({ kind: 'danger', title: 'كل حالة تحتاج عمود واحد على الأقل', description: `ناقص: ${missing.map((m) => STATUS[m].label).join('، ')}` }); return }
    }
    setBusy(true)
    try {
      await saveTicketStages(companyId, isDemo, named)
      pushToast({ kind: 'success', title: named.length ? 'انحفظت الأعمدة' : 'رجعت الأعمدة الافتراضية' })
      onClose()
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined })
    } finally { setBusy(false) }
  }

  return (
    <Dialog
      open={open} title="أعمدة لوحة التذاكر" onClose={onClose}
      footer={<>
        {stages.length > 0 && <Button variant="secondary" disabled={busy} onClick={() => save([])}>الأعمدة الافتراضية</Button>}
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button disabled={busy} onClick={() => save(rows)}>{busy ? 'جارِ الحفظ...' : 'حفظ'}</Button>
      </>}
    >
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
        سمّ الأعمدة ورتّبها مثل ما يشتغل فريقك. كل عمود يتبع حالة من الثلاث، عشان التقارير والأتمتة تبقى صحيحة.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '55vh', overflowY: 'auto' }}>
        {rows.map((r, i) => (
          <div key={r.id || `new-${i}`} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="ops-input sm" style={{ flex: '1 1 160px' }} aria-label="اسم العمود" value={r.name} onChange={(e) => set(i, { name: e.target.value })} />
            <select className="ops-input sm" style={{ flex: '0 1 140px' }} aria-label="الحالة" value={r.status} onChange={(e) => set(i, { status: e.target.value as TicketStatus })}>
              {(['open', 'in_progress', 'resolved'] as TicketStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </select>
            <button type="button" className="ops-icon" aria-label="لفوق" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
            <button type="button" className="ops-icon" aria-label="لتحت" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
            <button type="button" className="ops-icon" aria-label="حذف العمود" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <Button variant="secondary" size="sm" onClick={() => setRows((r) => [...r, { name: '', status: 'in_progress', position: r.length, color: null }])}><Plus size={14} /> عمود جديد</Button>
      </div>
    </Dialog>
  )
}
