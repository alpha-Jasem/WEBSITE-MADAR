import { useClientCompany } from './useClientCompany'
import { PLAN_LABELS } from '../lib/constants'

export function usePlanGate() {
  const { company } = useClientCompany()
  const plan = company?.plan ?? 'starter'
  const isPro = plan === 'growth' || plan === 'enterprise'
  const isPremium = plan === 'enterprise'

  return {
    plan,
    isPro,
    isPremium,
    planLabel: PLAN_LABELS[plan] ?? 'Starter',
    can: {
      reports: isPro,
      financeExpenses: isPro,
      workerRanking: isPro,
      workerPercentCommission: isPro,
      aiInsights: isPremium,
      multiBranch: isPremium,
    },
  }
}
