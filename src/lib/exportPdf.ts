export function printRowsAsPdf(title: string, columns: { key: string; label: string }[], rows: Record<string, string | number>[]) {
  const win = window.open('', '_blank')
  if (!win) return
  const head = columns.map((c) => `<th>${c.label}</th>`).join('')
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${r[c.key] ?? ''}</td>`).join('')}</tr>`).join('')
  win.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #14171f; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #666d8a; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #d8dbe6; padding: 8px 10px; text-align: right; }
      th { background: #f6f7fb; font-weight: 700; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>${title}</h1>
    <div class="meta">${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} — ${rows.length} سجل</div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    </body></html>`)
  win.document.close()
  win.focus()
  win.print()
}
