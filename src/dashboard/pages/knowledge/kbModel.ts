import type { OpsKnowledgeItem } from '@/lib/queries/ops'

export const DEFAULT_CATEGORIES = ['الأسعار', 'المواعيد والدوام', 'التأمين', 'الموقع', 'أسئلة عامة']

/** Section an item is filed under: metadata.category, else derived from its type. */
export function categoryOf(item: OpsKnowledgeItem): string {
  const c = item.metadata && typeof item.metadata.category === 'string' ? item.metadata.category.trim() : ''
  if (c) return c
  return item.type === 'policy' ? 'السياسات' : 'أسئلة عامة'
}
