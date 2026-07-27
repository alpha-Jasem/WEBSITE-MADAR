export async function exportRowsToExcel(filename: string, sheets: { name: string; rows: Record<string, string | number>[] }[]) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.json_to_sheet(sheet.rows)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  })
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
