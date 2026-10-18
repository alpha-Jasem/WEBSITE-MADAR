import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { writeAudit } from '../../../lib/deals'
import { dateShort, nf, timeShort } from '../../../lib/format'

interface Settings { vat_rate: number; vat_registered: boolean; min_margin_pct: number; renewal_alert_days: number; payroll_enabled: boolean; attribution_window_days: number | null; attribution_priority: string | null }
interface Source { id: string; name: string; feed_url: string; active: boolean }
interface Backup { id: string; status: string; tables: Record<string, number>; bytes: number | null; storage_path: string | null; started_at: string; error: string | null; restore_tested_at: string | null; restore_test_note: string }

// Agency-wide settings: tax, margin guard, renewal alerts, attribution terms, news sources and backups.
export function AgencySettingsPanel() {
  const [s, setS] = useState<Settings | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [backups, setBackups] = useState<Backup[]>([])
  const [src, setSrc] = useState({ name: '', feed_url: '' })
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from('agency_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('news_sources').select('*').order('created_at'),
      supabase.from('backup_runs').select('*').order('started_at', { ascending: false }).limit(5),
    ])
    if (a.data) setS(a.data as Settings)
    setSources((b.data ?? []) as Source[]); setBackups((c.data ?? []) as Backup[])
  }, [])
  useEffect(() => { load() }, [load])

  const save = async (patch: Partial<Settings>) => {
    if (!s) return
    const next = { ...s, ...patch }
    setS(next)
    const { error } = await supabase.from('agency_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) setMsg('تعذّر حفظ الإعداد.')
    else await writeAudit('agency_settings_changed', 'agency_settings', '1', s, next)
  }

  const addSource = async () => {
    if (!src.name.trim() || !src.feed_url.startsWith('https://')) { setMsg('رابط الخلاصة لازم يبدأ بـ https://'); return }
    const { error } = await supabase.from('news_sources').insert({ name: src.name.trim(), feed_url: src.feed_url.trim() })
    if (error) { setMsg(error.code === '23505' ? 'هذه الخلاصة مضافة مسبقًا.' : 'تعذّرت الإضافة.'); return }
    setSrc({ name: '', feed_url: '' }); setMsg(null); load()
  }
  const fetchNews = async () => {
    setBusy('news')
    const { data, error } = await supabase.functions.invoke('news-fetch', { body: {} })
    setMsg(error || !data?.ok ? 'تعذّر جلب الأخبار.' : !data.configured ? 'أضف مصدر أخبار أولًا.' : `جُلب ${nf(data.fetched)} خبر جديد${data.errors?.length ? ` · أخطاء: ${data.errors.map((e: { source: string; error: string }) => `${e.source} (${e.error})`).join('، ')}` : ''}`)
    setBusy(null)
  }
  const runBackup = async (action: 'export' | 'verify') => {
    setBusy(action)
    const { data, error } = await supabase.functions.invoke('backup-export', { body: { action } })
    setMsg(error || !data?.ok ? `تعذّر ${action === 'export' ? 'أخذ النسخة' : 'التحقق'}: ${data?.error ?? data?.note ?? ''}` : action === 'export' ? `تمت النسخة: ${data.tables} جدول` : data.note)
    setBusy(null); load()
  }

  if (!s) return null
  const field: React.CSSProperties = { height: 40, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--fill)', color: 'var(--ink)', padding: '0 12px' }

  return (
    <>
      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>إعدادات الوكالة</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          <div className="mc-grid2">
            <label className="mc-field">نسبة ضريبة القيمة المضافة %<input style={field} type="number" min={0} max={100} value={s.vat_rate} onChange={e => save({ vat_rate: Number(e.target.value) })} /></label>
            <label className="mc-field">حد الهامش الأدنى % (تنبيه ضعف الربحية)<input style={field} type="number" min={0} max={100} value={s.min_margin_pct} onChange={e => save({ min_margin_pct: Number(e.target.value) })} /></label>
            <label className="mc-field">تنبيه التجديد قبل (يوم)<input style={field} type="number" min={1} value={s.renewal_alert_days} onChange={e => save({ renewal_alert_days: Number(e.target.value) })} /></label>
            <label className="mc-field">المنشأة مسجلة في ضريبة القيمة المضافة؟
              <select style={field} value={s.vat_registered ? 'yes' : 'no'} onChange={e => save({ vat_registered: e.target.value === 'yes' })}><option value="yes">نعم</option><option value="no">لا</option></select></label>
          </div>
          <div className="mc-grid2">
            <label className="mc-field">نافذة إسناد الإحالات (يوم) · غير معتمدة إن تركتها فارغة<input style={field} type="number" min={1} value={s.attribution_window_days ?? ''} onChange={e => save({ attribution_window_days: e.target.value ? Number(e.target.value) : null })} /></label>
            <label className="mc-field">أولوية الإسناد عند التعارض
              <select style={field} value={s.attribution_priority ?? ''} onChange={e => save({ attribution_priority: e.target.value || null })}><option value="">غير معتمدة</option><option value="first_referrer">أول مسوّق</option><option value="last_referrer">آخر مسوّق</option><option value="owner_decides">قرار المالك</option></select></label>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', opacity: .7 }}>
            <input type="checkbox" disabled checked={s.payroll_enabled} style={{ width: 'auto' }} /> الرواتب <span className="mc-st mc-n2">قريبًا</span> <span className="mc-delta">معطلة افتراضيًا ولا تظهر في التقارير؛ تكاليف AI والأدوات تُسجل كمصروفات تشغيل.</span>
          </label>
        </div>
      </article>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>مصادر أخبار AI</h3><button className="mc-btn2 p" disabled={busy === 'news' || sources.length === 0} onClick={fetchNews}>{busy === 'news' ? 'جاري الجلب…' : 'اجلب الأخبار الآن'}</button></div>
        <div className="mc-delta" style={{ padding: '0 20px 10px' }}>أضف روابط RSS/Atom التي تثق بها. لا تُعرض أخبار بلا رابط وتاريخ، ويُجلب كل 6 ساعات تلقائيًا.</div>
        <div style={{ padding: '0 20px 14px', display: 'grid', gap: 8 }}>
          {sources.map(x => (
            <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <b>{x.name}</b><span dir="ltr" style={{ color: 'var(--ink-3)', fontSize: 12.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.feed_url}</span>
              <button className="mc-btn2" onClick={async () => { await supabase.from('news_sources').delete().eq('id', x.id); load() }}>حذف</button>
            </div>
          ))}
          <div className="mc-grid2"><input style={field} placeholder="اسم المصدر" aria-label="اسم المصدر" value={src.name} onChange={e => setSrc({ ...src, name: e.target.value })} /><input style={field} dir="ltr" placeholder="https://…/feed" aria-label="رابط الخلاصة" value={src.feed_url} onChange={e => setSrc({ ...src, feed_url: e.target.value })} /></div>
          <div><button className="mc-btn2 p" onClick={addSource}>إضافة مصدر</button></div>
        </div>
      </article>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>النسخ الاحتياطي</h3><div className="mc-phr"><button className="mc-btn2" disabled={busy !== null} onClick={() => runBackup('verify')}>تحقق من آخر نسخة</button><button className="mc-btn2 p" disabled={busy !== null} onClick={() => runBackup('export')}>{busy === 'export' ? 'جاري النسخ…' : 'خذ نسخة الآن'}</button></div></div>
        <div className="mc-delta" style={{ padding: '0 20px 10px', lineHeight: 1.8 }}>تُؤخذ نسخة يومية 3 فجرًا لجداول الوكالة في تخزين خاص. «التحقق» يفحص سلامة الملفات ومطابقتها للفهرس، وهو ليس استعادة في بيئة معزولة (تحتاج مشروعًا ثانيًا). موارد المزودين الخارجية (ElevenLabs, n8n) غير مشمولة.</div>
        {backups.length === 0 && <div className="mc-flat">لا توجد نسخ بعد.</div>}
        {backups.map(b => (
          <div key={b.id} className="mc-agent" style={{ alignItems: 'flex-start' }}>
            <div className="mc-m"><b style={{ display: 'block', font: '700 14px var(--head)' }}>{dateShort(b.started_at)} {timeShort(b.started_at)} · {b.status === 'ok' ? `${Object.keys(b.tables).length} جدول` : b.status === 'failed' ? 'فشلت' : 'جارية'}</b>
              <small style={{ color: 'var(--ink-3)', fontSize: 12 }}>{b.error ?? (b.restore_test_note || 'لم يُتحقق منها بعد')}</small></div>
            <span className={`mc-st ${b.status === 'ok' ? 'mc-g' : 'mc-a'}`}>{b.status === 'ok' ? 'ناجحة' : b.status === 'failed' ? 'فشلت' : 'جارية'}</span>
          </div>
        ))}
      </article>
      {msg && <div className="mc-banner">{msg}</div>}
    </>
  )
}
