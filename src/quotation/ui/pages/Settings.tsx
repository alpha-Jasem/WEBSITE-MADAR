import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NightPage, PageHead, CardTitle } from '@/dashboard/pages/shared/night'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useQt, saveSettings } from '../../store'
import type { QtSettings } from '../../types'
import { Field } from '../common'

export function QtSettingsPage() {
  const navigate = useNavigate()
  const { isDemo, can } = useWorkspace()
  const settings = useQt((s) => s.settings)
  const canApprove = useQt((s) => s.canApprove)
  const companyId = useQt((s) => s.companyId)
  const [copied, setCopied] = useState('')
  const rfqUrl = `${window.location.origin}${isDemo ? '/quotation-demo/rfq' : `/rfq/${companyId}`}`
  const embed = `<iframe src="${rfqUrl}" style="width:100%;min-height:760px;border:0" title="طلب عرض سعر"></iframe>`
  const copy = (what: string, text: string) => { void navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 2000) }
  const [form, setForm] = useState<QtSettings>(settings)
  const [saved, setSaved] = useState(false)
  useEffect(() => setForm(settings), [settings])
  const num = (k: keyof QtSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value === '' ? null : Number(e.target.value) })

  return (
    <NightPage>
      <PageHead title="الإعدادات والفريق" sub="قواعد الإصدار التي يلتزم بها الوكيل" />
      <div className="qt-card">
        <CardTitle>قواعد الإصدار التلقائي</CardTitle>
        <p style={{ margin: '-6px 0 14px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          يصدر الوكيل العرض بنفسه فقط إذا كانت كل البنود في الكتالوج بأسعار معتمدة، والخصم والهامش والقيمة ضمن هذه الحدود. غير ذلك يذهب لصاحب الصلاحية مع السبب.
        </p>
        <div className="np-form-grid">
          <Field label="أقصى خصم بدون موافقة %"><input className="qt-input qt-num" type="number" min={0} max={100} disabled={!canApprove} value={form.maxDiscountPct} onChange={num('maxDiscountPct')} /></Field>
          <Field label="أقل هامش ربح بدون موافقة %"><input className="qt-input qt-num" type="number" min={0} max={100} disabled={!canApprove} value={form.minMarginPct} onChange={num('minMarginPct')} /></Field>
          <Field label="حد الإصدار التلقائي (ر.س شامل الضريبة)" hint="فاضي = بدون حد"><input className="qt-input qt-num" type="number" min={0} disabled={!canApprove} value={form.autoIssueMaxTotal ?? ''} onChange={num('autoIssueMaxTotal')} /></Field>
          <Field label="عمر السعر المقبول (يوم)"><input className="qt-input qt-num" type="number" min={1} disabled={!canApprove} value={form.priceMaxAgeDays} onChange={num('priceMaxAgeDays')} /></Field>
          <Field label="ضريبة القيمة المضافة %"><input className="qt-input qt-num" type="number" min={0} max={100} disabled={!canApprove} value={form.vatRate} onChange={num('vatRate')} /></Field>
          <Field label="صلاحية العرض (يوم)"><input className="qt-input qt-num" type="number" min={1} disabled={!canApprove} value={form.validityDays} onChange={num('validityDays')} /></Field>
          <Field label="بادئة رقم العرض"><input className="qt-input qt-num" disabled={!canApprove} value={form.quotePrefix} onChange={(e) => setForm({ ...form, quotePrefix: e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 6) })} /></Field>
        </div>
        <div className="np-form-grid" style={{ marginTop: 14 }}>
          <Field label="شروط الدفع الافتراضية"><textarea className="qt-textarea" style={{ minHeight: 70 }} disabled={!canApprove} value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} /></Field>
          <Field label="شروط التسليم الافتراضية"><textarea className="qt-textarea" style={{ minHeight: 70 }} disabled={!canApprove} value={form.deliveryTerms} onChange={(e) => setForm({ ...form, deliveryTerms: e.target.value })} /></Field>
        </div>
        {canApprove ? (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', marginTop: 14 }}>
            {saved && <span style={{ color: 'var(--ok)', fontSize: 13 }}>تم الحفظ</span>}
            <button type="button" className="qt-btn pri" onClick={async () => { await saveSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2000) }}>حفظ القواعد</button>
          </div>
        ) : <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '12px 0 0' }}>تعديل القواعد للمالك والمدير فقط.</p>}
      </div>
      <div className="qt-card">
        <CardTitle>صفحة طلب عرض السعر</CardTitle>
        <p style={{ margin: '-6px 0 14px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          شارك الرابط مع عملائك أو ضعه في موقعك. العميل يكتب طلبه أو يرفع ملفه، والوكيل يقرأه ويطابقه مع الكتالوج ويجهّز العرض هنا.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="qt-input qt-num" readOnly value={rfqUrl} style={{ flex: '1 1 260px' }} aria-label="رابط الصفحة" onFocus={(e) => e.target.select()} />
          <button type="button" className="qt-btn pri" onClick={() => copy('link', rfqUrl)}>{copied === 'link' ? 'تم النسخ' : 'نسخ الرابط'}</button>
          <button type="button" className="qt-btn" onClick={() => copy('embed', embed)}>{copied === 'embed' ? 'تم النسخ' : 'نسخ كود الموقع'}</button>
          <a className="qt-btn ghost" href={rfqUrl} target="_blank" rel="noreferrer">فتح الصفحة</a>
        </div>
      </div>
      <div className="qt-card">
        <CardTitle>الفريق والصلاحيات</CardTitle>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          نفس فريق شركتك في مدار. المالك والمدير يشوفون التكلفة والهامش ويوافقون على الاستثناءات؛ الموظف يجهّز العروض ويتابعها.
        </p>
        {(isDemo || can('team.manage')) && <button type="button" className="qt-btn" onClick={() => navigate(isDemo ? '/demo-review/team' : '/dashboard/team')}>إدارة الفريق</button>}
      </div>
    </NightPage>
  )
}
