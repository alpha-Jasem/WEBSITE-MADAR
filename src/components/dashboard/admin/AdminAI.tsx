import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { dateShort, timeShort } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'
import { JarvisChat } from './JarvisChat'
import { usePush } from '../../../lib/push'

interface Cmd { id: string; action: string; after: Record<string, unknown> | null; created_at: string }
interface Preview { title: string; body: string }

const ACTION_LABEL: Record<string, string> = {
  add_task: 'أضاف مهمة', update_task: 'عدّل مهمة', set_goal: 'ضبط هدف الشهر', move_deal: 'نقل صفقة',
  deal_next_step: 'خطوة قادمة لصفقة', lead_follow_up: 'متابعة عميل', lead_note: 'ملاحظة على عميل',
}
const EXAMPLES = [
  'أضف مهمة اتصل بالنخبة بكرة الساعة 4 العصر',
  'هدف الشهر 120000',
  'ذكرني أتابع عيادة الريم بعد يومين',
]

// Jarvis page: talk to him, see what he changed, and check the morning brief and push notifications.
export const AdminAI = () => {
  const [cmds, setCmds] = useState<Cmd[]>([])
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const push = usePush()

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([
      supabase.from('audit_events').select('id, action, after, created_at').like('action', 'jarvis:%').order('created_at', { ascending: false }).limit(15),
      supabase.from('ai_settings').select('jarvis_enabled').eq('id', 1).maybeSingle(),
    ])
    setCmds((c.data ?? []) as Cmd[])
    setEnabled(s.data ? !!s.data.jarvis_enabled : true)
  }, [])
  useEffect(() => { load() }, [load])
  useRealtimeRefetch('admin_jarvis', [{ table: 'admin_tasks' }, { table: 'deals' }, { table: 'agency_goals' }], load, true)

  const briefPreview = async () => {
    setBusy('brief'); setNote(null)
    const { data, error } = await supabase.functions.invoke('outreach-daily', { body: { action: 'brief', preview: true } })
    setBusy(null)
    if (error || !data?.preview) { setNote('تعذّر تجهيز المعاينة.'); return }
    setPreview(data.preview as Preview)
  }
  const testPush = async () => {
    setBusy('push'); setNote(null)
    const { data, error } = await supabase.functions.invoke('outreach-daily', { body: { action: 'test_push' } })
    setBusy(null)
    if (error || !data?.ok) { setNote('فشل الإرسال.'); return }
    setNote(data.sent ? 'أُرسل إشعار تجريبي، شوف جوالك.' : 'ما فيه جهاز مفعّل. افتح اللوحة من جوالك وفعّل الإشعارات من Outreach ← «الرسائل والروابط».')
  }

  return (
    <div>
      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph">
          <h3>جارفيس</h3>
          {enabled === null ? null : <span className={`mc-st ${enabled ? 'mc-g' : 'mc-n2'}`}>{enabled ? 'مفعّل' : 'موقوف من الإعدادات'}</span>}
        </div>
        <div className="mc-delta" style={{ padding: '0 20px 6px', lineHeight: 1.8 }}>
          يتبع كلامك ويعدّل على لوحتك: مهام، هدف الشهر، مراحل الصفقات، متابعات العملاء وملاحظاتهم. ما يرسل رسائل، ولا يؤكد دفعات، ولا يقفل صفقة، ولا يحذف. كل تعديل يظهر لك ويُسجَّل.
        </div>
        <div style={{ padding: '0 20px 18px' }}>
          <JarvisChat compact onChanged={load} suggestions={EXAMPLES} />
        </div>
      </article>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>الإشعارات والملخص الصباحي</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          <div className="mc-delta" style={{ lineHeight: 1.8 }}>كل صباح الساعة 8 يوصلك ملخص يومك على الجوال. وتوصلك إشعارات فورية عند: دفعة جديدة، تحصيل، صفقة تنتقل لبانتظار الدفع أو تُغلق أو تُخسر، تحويل بنكي جديد، حلول موعد متابعة، واجتماع بعد دقائق.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="mc-btn2 p" onClick={briefPreview} disabled={busy === 'brief'}>{busy === 'brief' ? 'جاري التجهيز…' : 'عاين ملخص الصباح الآن'}</button>
            {(push.state === 'off' || push.state === 'busy') && <button className="mc-btn2 p" onClick={push.enable} disabled={push.state === 'busy'}>فعّل الإشعارات على هذا الجهاز</button>}
            <button className="mc-btn2" onClick={testPush} disabled={busy === 'push'}>أرسل لي إشعارًا تجريبيًا</button>
          </div>
          <div className="mc-delta">حالة هذا الجهاز: {({ checking: 'جاري الفحص…', unsupported: 'المتصفح لا يدعم الإشعارات', 'ios-install': 'ثبّت اللوحة على الشاشة الرئيسية أولًا (زر المشاركة ← إضافة إلى الشاشة الرئيسية)', off: 'غير مفعّل', on: 'مفعّل', denied: 'محظور من إعدادات المتصفح', busy: 'جاري التفعيل…' } as Record<string, string>)[push.state]}</div>
          {(note || push.note) && <div className="mc-delta">{note ?? push.note}</div>}
          {preview && (
            <div style={{ padding: 14, borderRadius: 14, background: 'var(--fill)', border: '1px solid var(--line)', lineHeight: 1.9 }}>
              <b>{preview.title}</b>
              <div style={{ whiteSpace: 'pre-line', color: 'var(--ink-2)', fontSize: 13.5 }}>{preview.body}</div>
              <small style={{ color: 'var(--ink-3)' }}>هذا شكل الإشعار كما يصل. لم يُرسل شيء.</small>
            </div>
          )}
        </div>
      </article>

      <article className="mc-card">
        <div className="mc-ph"><h3>آخر ما عدّله جارفيس</h3></div>
        {cmds.length === 0 && <div className="mc-flat">لم يعدّل شيئًا بعد.</div>}
        {cmds.map(c => (
          <div key={c.id} className="mc-act" style={{ cursor: 'default' }}>
            <div className="mc-m">
              <b>{ACTION_LABEL[c.action.replace('jarvis:', '')] ?? c.action.replace('jarvis:', '')}</b>
              <small>{summary(c)}</small>
            </div>
            <span className="mc-st mc-n2">{dateShort(c.created_at)} {timeShort(c.created_at)}</span>
          </div>
        ))}
      </article>
    </div>
  )
}

function summary(c: Cmd) {
  const a = c.after ?? {}
  const parts = [a.title, a.stage && `المرحلة: ${a.stage}`, a.next_step, a.amount != null && `${a.amount} ر.س`, a.notes && 'ملاحظة', a.next_follow_up && 'موعد متابعة'].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}
