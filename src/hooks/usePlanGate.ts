import { useClientCompany } from './useClientCompany'
import { PLAN_LABELS } from '../lib/constants'

export function usePlanGate() {
  const { company, loading } = useClientCompany()
  const plan = company?.plan ?? 'starter'
  const flags = ((company?.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>
  const isPro = plan === 'growth' || plan === 'enterprise'
  const isPremium = plan === 'enterprise'

  const allOpen = loading || !company

  return {
    plan,
    isPro,
    isPremium,
    planLabel: PLAN_LABELS[plan] ?? 'Starter',
    can: {
      reports: allOpen || isPro,
      financeExpenses: allOpen || isPro,
      workerRanking: allOpen || isPro,
      workerPercentCommission: allOpen || isPro,
      campaigns: allOpen || isPro,
      selfCheckin: allOpen || isPro,
      scheduledAutomations: allOpen || isPro,
      aiInsights: allOpen || isPremium,
      weeklyPromoAI: allOpen || isPremium,
      multiBranch: allOpen || isPremium,
      wallet: allOpen || Boolean(flags.wallet),
      memberships: allOpen || Boolean(flags.memberships),
      onlinePayments: allOpen || Boolean(flags.online_payments),
      customerRevenue: allOpen || Boolean(flags.wallet || flags.memberships || flags.online_payments),
    },
  }
}
