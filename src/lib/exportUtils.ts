export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    headers.map(escape).join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n')
  // BOM for correct Arabic display in Excel
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function formatDateForCSV(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-SA')
}
