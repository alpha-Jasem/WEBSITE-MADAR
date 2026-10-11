import { useMemo, useState } from 'react'
import { LayoutGrid, Loader2, Save } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { logAudit } from '../../../lib/auditLog'
import type { BusinessType, Company } from '../../../types'
import {
  ALL_MODULES, BUSINESS_TYPE_LABELS, INDUSTRY_PRESETS, MODULE_LABELS,
  isBusinessType, parseOverrides, type ModuleId, type ModuleOverrides,
} from '../../../dashboard/modules'

type Choice = 'preset' | 'on' | 'off'
const CHOICE_LABELS: Record<Choice, string> = { preset: 'حسب القطاع', on: 'مفعّل', off: 'مطفأ' }

/**
 * Lets a Madar admin pick a company's industry and override individual dashboard sections.
 * Only differences from the industry preset are saved, so changing the industry later still
 * brings the new preset's defaults with it.
 */
export function AdminModulesSection({ company, onUpdated }: { company: Company; onUpdated: () => void }) {
  const initialType: BusinessType = isBusinessType(company.business_type) ? company.business_type : 'other'
  const initialOverrides = useMemo(() => parseOverrides(company.dashboard_modules), [company.dashboard_modules])
  const [businessType, setBusinessType] = useState<BusinessType>(initialType)
  const [overrides, setOverrides] = useState<ModuleOverrides>(initialOverrides)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const preset = new Set<ModuleId>(INDUSTRY_PRESETS[businessType])
  const changed = businessType !== initialType || JSON.stringify(overrides) !== JSON.stringify(initialOverrides)

  const choiceOf = (id: ModuleId): Choice => (overrides[id] === true ? 'on' : overrides[id] === false ? 'off' : 'preset')
  const setChoice = (id: ModuleId, c: Choice) => {
    setOverrides((prev) => {
      const next = { ...prev }
      // An override equal to the preset is dropped: it adds nothing and would pin the value
      // if the industry changes later.
      const presetOn = preset.has(id)
      if (c === 'preset' || (c === 'on') === presetOn) delete next[id]
      else next[id] = c === 'on'
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    const { error } = await supabase
      .from('companies')
      .update({ business_type: businessType, industry: businessType, dashboard_modules: overrides } as Record<string, unknown>)
      .eq('id', company.id)
    setSaving(false)
    if (error) {
      setMessage({ ok: false, text: /dashboard_modules/.test(error.message) ? 'عمود الأقسام غير موجود بعد في قاعدة البيانات — يحتاج ترحيل.' : 'تعذر الحفظ. حاول مرة أخرى.' })
      return
    }
    logAudit(company.id, 'company_modules_updated', {
      entityType: 'company',
      entityId: company.id,
      oldValue: { business_type: initialType, dashboard_modules: initialOverrides },
      newValue: { business_type: businessType, dashboard_modules: overrides },
    })
    setMessage({ ok: true, text: 'تم حفظ القطاع والأقسام' })
    onUpdated()
  }

  return (
    <section className="rounded-3xl bg-white p-5" style={{ border: '1px solid #E2E8F0' }}>
      <div className="mb-4 flex items-center gap-2">
        <LayoutGrid size={16} className="text-blue-600" />
        <h3 className="text-sm font-bold text-slate-900 font-cairo">القطاع وأقسام الداشبورد</h3>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map((t) => (
          <button key={t} type="button" onClick={() => setBusinessType(t)}
            className="rounded-2xl p-2.5 text-center text-sm font-bold font-cairo transition-all"
            style={{
              border: `1px solid ${businessType === t ? '#4F6EF7' : '#E2E8F0'}`,
              background: businessType === t ? '#4F6EF712' : '#FFFFFF',
              color: businessType === t ? '#4F6EF7' : '#334155',
            }}>
            {BUSINESS_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="divide-y divide-slate-100">
        {ALL_MODULES.map((id) => {
          const choice = choiceOf(id)
          const effective = choice === 'preset' ? preset.has(id) : choice === 'on'
          return (
            <div key={id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-800 font-cairo">{MODULE_LABELS[id]}</div>
                <div className="text-[11px] font-tajawal" style={{ color: effective ? '#059669' : '#94A3B8' }}>
                  {effective ? 'يظهر للعميل' : 'مخفي'}{choice === 'preset' ? ' (افتراضي القطاع)' : ''}
                </div>
              </div>
              <div className="flex shrink-0 rounded-xl bg-slate-100 p-0.5">
                {(['preset', 'on', 'off'] as Choice[]).map((c) => (
                  <button key={c} type="button" onClick={() => setChoice(id, c)}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-bold font-cairo transition-all"
                    style={{
                      background: choice === c ? '#FFFFFF' : 'transparent',
                      color: choice === c ? '#0F172A' : '#64748B',
                      boxShadow: choice === c ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
                    }}>
                    {CHOICE_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <button type="button" onClick={save} disabled={saving || !changed}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white font-cairo disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #0EA5E9, #4F6EF7)' }}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        حفظ القطاع والأقسام
      </button>
      {message && (
        <div className={`mt-3 rounded-2xl p-3 text-center text-sm font-bold font-tajawal ${message.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}
    </section>
  )
}
