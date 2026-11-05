import type { ReactNode } from 'react'
import type { DocStatus, QtQuote, WorkState } from '../types'
import { Chip, type ChipTone } from '@/dashboard/pages/shared/night'

export const DOC_LABEL: Record<DocStatus, string> = {
  draft: 'مسودة', ready: 'جاهز للإرسال', sent: 'مُرسل', accepted: 'مقبول', rejected: 'مرفوض', expired: 'منتهي',
}
const DOC_TONE: Record<DocStatus, ChipTone> = { draft: 'muted', ready: 'info', sent: 'ai', accepted: 'ok', rejected: 'bad', expired: 'muted' }

export const WORK_LABEL: Record<WorkState, string> = {
  none: '', preparing: 'قيد التجهيز', needs_info: 'ينتظر معلومة', awaiting_approval: 'ينتظر موافقة',
}
const WORK_TONE: Record<WorkState, ChipTone> = { none: 'muted', preparing: 'info', needs_info: 'warn', awaiting_approval: 'warn' }

/** Document status and processing state shown side by side, never merged into one label. */
export function QuoteStatus({ q }: { q: Pick<QtQuote, 'docStatus' | 'workState'> }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      <Chip tone={DOC_TONE[q.docStatus]}>{DOC_LABEL[q.docStatus]}</Chip>
      {q.workState !== 'none' && <Chip tone={WORK_TONE[q.workState]}>{WORK_LABEL[q.workState]}</Chip>}
    </span>
  )
}

export function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'الآن'
  if (s < 3600) return `قبل ${Math.round(s / 60)} د`
  if (s < 86400) return `قبل ${Math.round(s / 3600)} س`
  return `قبل ${Math.round(s / 86400)} يوم`
}

export function prepSeconds(q: Pick<QtQuote, 'prepStartedAt' | 'prepFinishedAt'>) {
  if (!q.prepStartedAt || !q.prepFinishedAt) return null
  return Math.max(0, (new Date(q.prepFinishedAt).getTime() - new Date(q.prepStartedAt).getTime()) / 1000)
}

export function fmtDuration(sec: number | null) {
  if (sec == null) return '—'
  if (sec < 60) return `${Math.round(sec)} ث`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return s ? `${m} د ${s} ث` : `${m} د`
}

export const QT_CSS = `
.qt-input, .qt-select, .qt-textarea { width: 100%; box-sizing: border-box; background: var(--surface-input); color: var(--text-primary);
  border: 1px solid var(--line-2); border-radius: 8px; padding: 0 10px; height: 36px; font: inherit; font-size: 13.5px; }
.qt-textarea { height: auto; min-height: 120px; padding: 10px; line-height: 1.7; resize: vertical; }
.qt-input:focus-visible, .qt-select:focus-visible, .qt-textarea:focus-visible { outline: 2px solid var(--line-2); outline-offset: 1px; border-color: var(--muted); }
.qt-label { display: block; font-size: 12.5px; color: var(--muted); margin-bottom: 6px; font-weight: 500; }
.qt-field { display: block; min-width: 0; }
.qt-card { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 18px 20px; min-width: 0; }
.qt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 36px; padding: 0 16px; border-radius: 999px;
  font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; border: 1px solid var(--line-2);
  background: var(--panel-2); color: var(--text-primary); text-decoration: none; }
.qt-btn:hover { background: var(--raise); }
.qt-btn:disabled { opacity: .45; cursor: not-allowed; }
.qt-btn.pri { background: var(--pri-bg); color: var(--pri-fg); border-color: transparent; }
.qt-btn.pri:hover { background: var(--pri-hover); }
.qt-btn.ghost { background: none; border-color: transparent; color: var(--muted); }
.qt-btn.ghost:hover { color: var(--ink); background: var(--hover-bg); }
.qt-btn.danger { background: var(--bad-bg); color: var(--bad); border-color: transparent; }
.qt-btn.sm { height: 28px; padding: 0 10px; font-size: 12px; }
.qt-btn:focus-visible, .qt-link:focus-visible { outline: 2px solid var(--muted); outline-offset: 2px; }
.qt-link { background: none; border: 0; padding: 0; color: var(--text-primary); font: inherit; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
.qt-issue { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; font-size: 13px; line-height: 1.6; }
.qt-issue.blocking { background: var(--warn-bg); color: var(--warn); }
.qt-issue.approval { background: var(--ai-bg); color: var(--ai); }
.qt-accent { --qt: var(--violet); }
.qt-num { font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; }
.qt-note { padding: 12px 16px; border-radius: 12px; font-size: 13.5px; background: var(--bad-bg); color: var(--bad); }
.qt-note[data-ok="true"] { background: var(--ok-bg); color: var(--ok); }
.qt-drop { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 16px; border: 1px dashed var(--line-2);
  border-radius: 14px; background: var(--panel-2); color: var(--text-primary); font: inherit; cursor: pointer; text-align: center; }
.qt-drop svg { color: var(--sky); }
.qt-drop b { font-weight: 500; font-size: 14.5px; }
.qt-drop small { color: var(--muted); font-size: 12.5px; max-width: 460px; line-height: 1.7; }
.qt-drop:hover { border-color: var(--sky); }
@media (max-width: 900px) { .qt-btn { min-height: 40px; } .qt-input, .qt-select { height: 42px; } }
`

export function QtStyles() { return <style>{QT_CSS}</style> }

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="qt-field">
      <span className="qt-label">{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--dim)', marginTop: 4 }}>{hint}</span>}
    </label>
  )
}
