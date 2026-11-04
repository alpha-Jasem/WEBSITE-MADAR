import { useRef, useState } from 'react'
import { Plus, Upload, AlertTriangle } from 'lucide-react'
import { NightPage, PageHead, EmptyLine, Chip, Toggle } from '@/dashboard/pages/shared/night'
import { useQt, saveProduct, importProducts } from '../../store'
import { previewCatalog, readSheet, type ImportPreview } from '../../importer'
import type { QtProduct } from '../../types'
import { Field, fmtDate, fmtMoney } from '../common'

const blank = (): QtProduct => ({ id: crypto.randomUUID(), sku: '', name: '', unit: 'حبة', unitPrice: null, unitCost: null, priceSource: 'إدخال يدوي', priceUpdatedAt: null, active: true })

export function QtProducts() {
  const products = useQt((s) => s.products)
  const settings = useQt((s) => s.settings)
  const canSeeCosts = useQt((s) => s.canSeeCosts)
  const [edit, setEdit] = useState<QtProduct | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [fileName, setFileName] = useState('')
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const stale = (p: QtProduct) => p.priceUpdatedAt && Date.now() - new Date(p.priceUpdatedAt).getTime() > settings.priceMaxAgeDays * 86400000

  async function onFile(f?: File) {
    setErr('')
    if (!f) return
    try {
      const rows = await readSheet(f)
      setPreview(previewCatalog(rows, products, `ملف: ${f.name}`)); setFileName(f.name)
    } catch { setErr('تعذر قراءة الملف. ارفع Excel أو CSV.') }
  }

  async function saveEdit() {
    if (!edit || !edit.name.trim()) return
    const prev = products.find((p) => p.id === edit.id)
    const priceChanged = !prev || prev.unitPrice !== edit.unitPrice
    await saveProduct({ ...edit, priceUpdatedAt: priceChanged && edit.unitPrice != null ? new Date().toISOString() : edit.priceUpdatedAt, priceSource: priceChanged ? 'إدخال يدوي' : edit.priceSource })
    setEdit(null)
  }

  const list = q.trim() ? products.filter((p) => p.name.includes(q.trim()) || p.sku.toLowerCase().includes(q.trim().toLowerCase())) : products

  return (
    <NightPage>
      <PageHead title="المنتجات والتسعير" sub={`${products.length} منتج · الوكيل يسعّر من هذا الكتالوج فقط`} actions={<>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        <button type="button" className="qt-btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> استيراد Excel</button>
        <button type="button" className="qt-btn pri" onClick={() => setEdit(blank())}><Plus size={15} /> منتج</button>
      </>} />
      {err && <div className="qt-issue blocking">{err}</div>}

      {preview && (
        <div className="qt-card">
          <h3 className="np-h3">معاينة الاستيراد: {fileName}</h3>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)' }}>
            {preview.rows.filter((r) => !r.existingId).length} جديد · {preview.rows.filter((r) => r.existingId).length} تحديث · {preview.errors.length} خطأ. ما يُحفظ شي قبل الاعتماد.
          </p>
          {preview.errors.map((e) => <div key={e.row} className="qt-issue blocking" style={{ marginBottom: 6 }}><AlertTriangle size={14} /> سطر {e.row}: {e.message}</div>)}
          <div className="np-table-wrap" style={{ maxHeight: 280, overflowY: 'auto' }}>
            <table className="np-table">
              <thead><tr><th>سطر</th><th>الرمز</th><th>الاسم</th><th>السعر</th>{canSeeCosts && <th>التكلفة</th>}<th /></tr></thead>
              <tbody>{preview.rows.map((r) => (
                <tr key={r.row}><td>{r.row}</td><td className="qt-num">{r.product.sku || '—'}</td><td>{r.product.name}</td><td className="qt-num">{r.product.unitPrice == null ? 'بدون سعر' : fmtMoney(r.product.unitPrice)}</td>{canSeeCosts && <td className="qt-num">{r.product.unitCost == null ? '—' : fmtMoney(r.product.unitCost)}</td>}<td>{r.existingId ? <Chip tone="info">تحديث</Chip> : <Chip tone="ok">جديد</Chip>}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="qt-btn ghost" onClick={() => setPreview(null)}>إلغاء</button>
            <button type="button" className="qt-btn pri" disabled={preview.rows.length === 0} onClick={async () => { await importProducts(preview.rows); setPreview(null) }}>اعتماد {preview.rows.length} منتج</button>
          </div>
        </div>
      )}

      {edit && (
        <div className="qt-card">
          <div className="np-form-grid">
            <Field label="اسم المنتج أو الخدمة"><input className="qt-input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="الاسم بالإنجليزي"><input className="qt-input" dir="ltr" value={edit.nameEn ?? ''} onChange={(e) => setEdit({ ...edit, nameEn: e.target.value })} /></Field>
            <Field label="الرمز (SKU)"><input className="qt-input qt-num" value={edit.sku} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /></Field>
            <Field label="الوحدة"><input className="qt-input" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></Field>
            <Field label="سعر البيع (بدون ضريبة)" hint="اتركه فاضي إذا السعر غير معتمد؛ الوكيل بيطلب قرارًا بدل ما يخمّن."><input className="qt-input qt-num" type="number" min={0} value={edit.unitPrice ?? ''} onChange={(e) => setEdit({ ...edit, unitPrice: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
            {canSeeCosts && <Field label="التكلفة (داخلي)"><input className="qt-input qt-num" type="number" min={0} value={edit.unitCost ?? ''} onChange={(e) => setEdit({ ...edit, unitCost: e.target.value === '' ? null : Number(e.target.value) })} /></Field>}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="qt-btn ghost" onClick={() => setEdit(null)}>إلغاء</button>
            <button type="button" className="qt-btn pri" disabled={!edit.name.trim()} onClick={saveEdit}>حفظ</button>
          </div>
        </div>
      )}

      <input className="qt-input" placeholder="ابحث بالاسم أو الرمز" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث في المنتجات" />
      <div className="qt-card">
        {list.length === 0 ? <EmptyLine>الكتالوج فاضي. استورد ملف Excel فيه أعمدة: الرمز، الاسم، الوحدة، السعر، التكلفة.</EmptyLine> : (
          <div className="np-table-wrap">
            <table className="np-table">
              <thead><tr><th>المنتج</th><th>الرمز</th><th>السعر</th>{canSeeCosts && <th>التكلفة</th>}{canSeeCosts && <th>الهامش</th>}<th>مصدر السعر</th><th>فعّال</th><th /></tr></thead>
              <tbody>{list.map((p) => {
                const m = canSeeCosts && p.unitPrice && p.unitCost != null ? Math.round(((p.unitPrice - p.unitCost) / p.unitPrice) * 1000) / 10 : null
                return (
                  <tr key={p.id}>
                    <td className="strong">{p.name}<small style={{ display: 'block', color: 'var(--dim)', fontWeight: 400 }}>{p.unit}</small></td>
                    <td className="qt-num">{p.sku || '—'}</td>
                    <td className="qt-num">{p.unitPrice == null ? <Chip tone="warn">بدون سعر</Chip> : fmtMoney(p.unitPrice)}</td>
                    {canSeeCosts && <td className="qt-num">{p.unitCost == null ? '—' : fmtMoney(p.unitCost)}</td>}
                    {canSeeCosts && <td>{m == null ? '—' : <span className="qt-num" style={{ color: m < settings.minMarginPct ? 'var(--warn)' : undefined }}>{m}%</span>}</td>}
                    <td><small>{p.priceSource}</small><small style={{ display: 'block', color: stale(p) ? 'var(--warn)' : 'var(--dim)' }}>{p.priceUpdatedAt ? `${fmtDate(p.priceUpdatedAt)}${stale(p) ? ' · قديم' : ''}` : '—'}</small></td>
                    <td><Toggle checked={p.active} label={`تفعيل ${p.name}`} onChange={(v) => saveProduct({ ...p, active: v })} /></td>
                    <td><button type="button" className="qt-btn ghost sm" onClick={() => setEdit(p)}>تعديل</button></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </NightPage>
  )
}
