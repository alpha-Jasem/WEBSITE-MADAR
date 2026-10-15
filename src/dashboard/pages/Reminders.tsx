import { MessageCircle, Bell, Phone, Star, CalendarX2 } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useReminderRules, toggleReminderRule, setReminderTemplate } from '@/lib/dashboardQueries'
import { useWaTemplates, placeholderCount } from '@/lib/queries/outreach'
import { Card, Input, Select } from '@/dashboard/components/primitives'
import { NightPage, PageHead, CardTitle, Toggle, Chip, fmtNum } from './shared/night'
import { EmptyState, SkeletonRows, useToast } from '@/dashboard/components/uiExtras'

const ICON_BY_KEY: Record<string, React.ReactNode> = {
  reminder_24h: <MessageCircle size={17} />,
  reminder_3h: <Bell size={17} />,
  call_unconfirmed: <Phone size={17} />,
  review_request: <Star size={17} />,
  no_show_alert: <CalendarX2 size={17} />,
}

/** Rules that send a WhatsApp template; they only send once a template is chosen. */
const TEMPLATE_RULES = new Set(['reminder_24h', 'reminder_3h', 'review_request'])
const WHEN: Record<string, string> = {
  reminder_24h: 'يُرسل قبل الموعد بحوالي 24 ساعة',
  reminder_3h: 'يُرسل قبل الموعد بحوالي ساعتين',
  review_request: 'يُرسل بعد الزيارة بساعة إلى 6 ساعات',
  no_show_alert: 'يوصلك إشعار هنا بعد 30 دقيقة من وقت الموعد لو ما حضر العميل',
}
const TOKENS = '{{customer.name}} · {{booking.date}} · {{booking.time}} · {{booking.service}}'
const DEFAULT_PARAMS = ['{{customer.name}}', '{{booking.date}} {{booking.time}}', '{{booking.service}}']

export function DashboardV2Reminders() {
  const { companyId, isDemo, can } = useWorkspace()
  const pushToast = useToast()
  const { data: rules, loading, refetch } = useReminderRules(companyId, isDemo)
  const { templates } = useWaTemplates(companyId, isDemo)
  const canEdit = can('outreach.send') || can('team.manage')

  async function toggle(id: string, current: boolean) {
    if (isDemo) return
    await toggleReminderRule(id, !current)
    refetch()
  }

  async function chooseTemplate(id: string, templateId: string) {
    if (isDemo) return
    const t = templates.find((x) => x.id === templateId)
    try {
      await setReminderTemplate(id, templateId || null, t ? Array.from({ length: placeholderCount(t.body) }, (_, i) => DEFAULT_PARAMS[i] || '') : [])
      refetch()
    } catch { pushToast({ kind: 'danger', title: 'تعذّر الحفظ' }) }
  }

  async function setParam(id: string, templateId: string | null, params: string[], i: number, v: string) {
    if (isDemo) return
    const next = [...params]; next[i] = v
    try { await setReminderTemplate(id, templateId, next); refetch() } catch { pushToast({ kind: 'danger', title: 'تعذّر الحفظ' }) }
  }

  const list = rules || []
  const on = list.filter((r) => r.enabled).length

  return (
    <NightPage>
      <PageHead title="التذكيرات" sub="تذكير العملاء بمواعيدهم تلقائيًا عبر واتساب. اختر القالب المعتمد لكل قاعدة وتبدأ تشتغل" />
      <Card>
        <CardTitle aside={loading ? null : `${fmtNum(on)} مفعّلة من ${fmtNum(list.length)}`}>قواعد التذكير</CardTitle>
        {loading && <SkeletonRows rows={5} columns={2} />}
        {!loading && list.map((r) => {
          const needsTemplate = TEMPLATE_RULES.has(r.rule_key)
          const tplId = (r as { template_id?: string | null }).template_id || ''
          const tpl = templates.find((t) => t.id === tplId)
          const params = ((r as { params?: string[] | null }).params || []) as string[]
          const comingSoon = r.rule_key === 'call_unconfirmed'
          return (
            <div key={r.id} style={{ borderBottom: '1px solid var(--line)', padding: '4px 0 12px' }}>
              <div className="np-row" style={{ borderBottom: 0 }}>
                <div className="np-icon-tile" style={{ background: 'var(--info-bg)', color: 'var(--sky)' }}>{ICON_BY_KEY[r.rule_key] || <Bell size={17} />}</div>
                <div className="np-row-main">
                  <b>{r.label}</b>
                  <small>{comingSoon ? 'قريبًا' : WHEN[r.rule_key]}</small>
                </div>
                {needsTemplate && r.enabled && !tplId && <Chip tone="warn">اختر قالب</Chip>}
                {needsTemplate && r.enabled && tplId && <Chip tone="ok">شغّال</Chip>}
                <Toggle checked={r.enabled && !comingSoon} disabled={comingSoon} label={r.label} onChange={() => toggle(r.id, r.enabled)} />
              </div>
              {needsTemplate && r.enabled && canEdit && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingInlineStart: 52 }}>
                  <Select label="قالب واتساب المعتمد" value={tplId} onChange={(e) => void chooseTemplate(r.id, e.target.value)}
                    options={[{ value: '', label: templates.length ? 'اختر قالب' : 'ما فيه قوالب، أضف قالب من «الرسائل الصادرة»' }, ...templates.map((t) => ({ value: t.id, label: t.label }))]} />
                  {tpl && Array.from({ length: placeholderCount(tpl.body) }, (_, i) => (
                    <Input key={i} label={`قيمة «${tpl.param_labels[i] || `المتغير ${i + 1}`}»`} value={params[i] ?? ''}
                      onChange={(e) => void setParam(r.id, tplId, params, i, e.target.value)} />
                  ))}
                  {tpl && <small style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>تقدر تستخدم: {TOKENS}</small>}
                </div>
              )}
            </div>
          )
        })}
        {!loading && list.length === 0 && (
          <EmptyState icon={<Bell size={20} />} title="جارِ تجهيز القواعد" description="قواعد التذكير الآلي تُفعّل تلقائياً مع حسابك — راجع الصفحة بعد قليل." />
        )}
      </Card>
    </NightPage>
  )
}
