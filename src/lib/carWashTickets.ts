type TicketItem = {
  id: string
  created_at: string
}

export function getDailyTicketCode(items: TicketItem[], itemId: string) {
  const ordered = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const index = ordered.findIndex(item => item.id === itemId)
  const value = index >= 0 ? index + 1 : 1
  return `A-${String(value).padStart(3, '0')}`
}
