// Jarvis v1: a morning brief built by plain rules from real counts. No model, no invented data.
// Every action carries the reason it was suggested, so the owner can judge it.
export interface BriefFacts {
  dueToday: number
  overdue: number
  meetingsToday: number
  waitingFirstContact: number
  dealsWithoutNextStep: number
  qualifiedDeals: number
  activeDeals: number
  hasMonthlyGoal: boolean
  integrationsFailing: string[]
  pendingPayments?: number
}

export interface BriefAction {
  id: string
  title: string
  reason: string
  to: string
}

export interface Brief {
  summary: string
  actions: BriefAction[]
  tone: 'calm' | 'busy' | 'alert'
}

const n = (v: number) => v.toLocaleString('en-US')

export function buildBrief(f: BriefFacts): Brief {
  const actions: BriefAction[] = []

  if (f.meetingsToday > 0) {
    actions.push({
      id: 'meetings', to: '/admin/outreach',
      title: `جهّز ${n(f.meetingsToday)} اجتماع${f.meetingsToday > 1 ? 'ات' : ''} اليوم`,
      reason: 'لديك اجتماعات مؤكدة في التقويم اليوم.',
    })
  }
  if ((f.pendingPayments ?? 0) > 0) {
    actions.push({
      id: 'payments', to: '/admin/finance',
      title: `راجع ${n(f.pendingPayments!)} دفعة بانتظار التحقق`,
      reason: 'حوالات مسجلة لم تُؤكد، ولا تُحتسب تحصيلًا قبل تأكيدك.',
    })
  }
  if (f.overdue > 0) {
    actions.push({
      id: 'overdue', to: '/admin/outreach',
      title: `تابع ${n(f.overdue)} عميل متأخر`,
      reason: 'موعد متابعتهم فات، وكل يوم تأخير يقلل احتمال الرد.',
    })
  } else if (f.dueToday > 0) {
    actions.push({
      id: 'due', to: '/admin/outreach',
      title: `تابع ${n(f.dueToday)} عميل اليوم`,
      reason: 'حان موعد المتابعة المجدولة لهم.',
    })
  }
  if (f.dealsWithoutNextStep > 0) {
    actions.push({
      id: 'nextstep', to: '/admin/pipeline',
      title: `حدد خطوة قادمة لـ${n(f.dealsWithoutNextStep)} صفقة`,
      reason: 'صفقات مفتوحة بلا خطوة قادمة تتوقف بصمت.',
    })
  }
  if (f.integrationsFailing.length > 0) {
    actions.push({
      id: 'integrations', to: '/admin/settings',
      title: `راجع التكاملات: ${f.integrationsFailing.slice(0, 2).join('، ')}`,
      reason: 'آخر فحص فعلي أظهر خللًا فيها.',
    })
  }
  if (f.waitingFirstContact > 0 && actions.length < 3) {
    actions.push({
      id: 'first', to: '/admin/outreach',
      title: `ابدأ التواصل مع أول ${n(Math.min(f.waitingFirstContact, 20))} عميل جديد`,
      reason: `${n(f.waitingFirstContact)} عميل ينتظر أول تواصل.`,
    })
  }
  if (!f.hasMonthlyGoal && actions.length < 3) {
    actions.push({
      id: 'goal', to: '/admin',
      title: 'حدد هدف التحصيل لهذا الشهر',
      reason: 'بدون هدف لا يمكن قياس المتبقي.',
    })
  }

  const top = actions.slice(0, 3)
  const busy = f.dueToday + f.overdue + f.meetingsToday
  const alert = f.integrationsFailing.length > 0 || f.overdue > 0
  const summary = busy > 0
    ? `اليوم: ${n(f.meetingsToday)} اجتماعات و${n(f.dueToday + f.overdue)} متابعات، و${n(f.activeDeals)} صفقة مفتوحة.`
    : f.activeDeals > 0
      ? `ما عندك مواعيد اليوم، و${n(f.activeDeals)} صفقة مفتوحة تنتظر تقدمًا.`
      : 'ما عندك مواعيد ولا صفقات مفتوحة. وقت مناسب لجلب عملاء جدد.'

  return { summary, actions: top, tone: alert ? 'alert' : busy > 0 ? 'busy' : 'calm' }
}
