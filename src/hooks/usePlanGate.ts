import { useClientCompany } from './useClientCompany'
import { PLAN_LABELS } from '../lib/constants'

export function usePlanGate() {
  const { company, loading } = useClientCompany()
  const plan = company?.plan ?? 'starter'
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
      scheduledAutomations: allOpen || isPro,
      aiInsights: allOpen || isPremium,
      weeklyPromoAI: allOpen || isPremium,
      multiBranch: allOpen || isPremium,
    },
  }
}
