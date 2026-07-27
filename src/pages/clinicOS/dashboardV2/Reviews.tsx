import { useMemo, useState } from 'react'
import { Star, Plus, MapPin, AlertTriangle } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import {
  useClinicBranches, useClinicGoogleReviews, useClinicSupportTickets,
  createBranch, replyToReview,
} from '../../../lib/clinicOSQueries'
import type { GoogleReview } from '../../../types/clinicOS'
import { Card, Badge, Button, Dialog, Input, Toast, type BadgeTone } from '../../../components/clinicOS/v2/primitives'

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: 'var(--warning-500)', letterSpacing: 1 }}>
      {'★'.repeat(n)}<span style={{ color: 'var(--slate-200)' }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

const STATUS_LABEL: Record<string, string> = { pending: 'بانتظار الرد', auto_replied: 'تم الرد', replied: 'تم الرد' }
const STATUS_TONE: Record<string, BadgeTone> = { pending: 'warning', auto_replied: 'success', replied: 'success' }

export function DashboardV2Reviews() {
  const { companyId, isDemo } = useClinicOS()
  const { data: branches, refetch: refetchBranches } = useClinicBranches(companyId, isDemo)
  const { data: reviews, refetch: refetchReviews } = useClinicGoogleReviews(companyId, isDemo)
  const { data: tickets } = useClinicSupportTickets(companyId, isDemo)

  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', google_maps_url: '' })
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ title: string; description?: string } | null>(null)

  const branchList = branches || []
  const activeBranch = activeBranchId ? branchList.find((b) => b.id === activeBranchId) : branchList[0]
  const branchReviews = useMemo(
    () => (reviews || []).filter((r) => !activeBranch || r.branch_id === activeBranch.id),
    [reviews, activeBranch],
  )

  const ticketByReviewId = useMemo(() => {
    const map: Record<string, (typeof tickets)[number]> = {}
    ;(tickets || []).forEach((t) => {
      if (t.route?.startsWith('google_review:')) map[t.route.replace('google_review:', '')] = t
    })
    return map
  }, [tickets])

  const overallRating = useMemo(() => {
    const rated = (reviews || []).filter((r) => activeBranch ? r.branch_id === activeBranch.id : true)
    if (!rated.length) return null
    return Math.round((rated.reduce((sum, r) => sum + r.rating, 0) / rated.length) * 10) / 10
  }, [reviews, activeBranch])

  async function addBranch() {
    if (!form.name.trim() || !companyId) return
    setSaving(true)
    try {
      await createBranch({ company_id: companyId, name: form.name, address: form.address, google_maps_url: form.google_maps_url || undefined })
      setAddOpen(false)
      setForm({ name: '', address: '', google_maps_url: '' })
      refetchBranches()
      setToast({ title: 'تم إضافة الفرع' })
    } catch (e) {
      setToast({ title: 'تعذّر إضافة الفرع', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  async function sendReply(review: GoogleReview) {
    const text = drafts[review.id]
    if (!text?.trim()) return
    try {
      await replyToReview(review.id, text)
      refetchReviews()
      setToast({ title: 'تم إرسال الرد' })
    } catch (e) {
      setToast({ title: 'تعذّر إرسال الرد', description: e instanceof Error ? e.message : undefined })
    } finally {
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (branchList.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={20} style={{ color: 'var(--warning-500)' }} /> AI Google Reviews
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>تقييمات Google مع ردود مقترحة بالذكاء الاصطناعي</div>
        </div>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-full)', background: 'var(--warning-100)', color: 'var(--warning-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Star size={26} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>جاهزة لاستقبال بيانات Google</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 420, lineHeight: 1.7, marginBottom: 20 }}>
              أضف فرعك الأول مع رابط خرائط Google الخاص به، وسيبدأ مدار بسحب تقييماته والرد عليها تلقائياً.
            </div>
            <Button onClick={() => setAddOpen(true)}><Plus size={15} /> إضافة أول فرع</Button>
          </div>
        </Card>
        {renderAddDialog()}
      </div>
    )
  }

  function renderAddDialog() {
    return (
      <Dialog
        open={addOpen} title="إضافة فرع" onClose={() => setAddOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>إلغاء</Button><Button onClick={addBranch} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'حفظ الفرع'}</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="اسم الفرع" placeholder="مثال: الفرع الرئيسي - جدة" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="العنوان" placeholder="الحي، المدينة" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          <Input label="رابط خرائط Google" placeholder="https://maps.google.com/..." value={form.google_maps_url} onChange={(e) => setForm((f) => ({ ...f, google_maps_url: e.target.value }))} />
        </div>
      </Dialog>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={20} style={{ color: 'var(--warning-500)' }} /> AI Google Reviews
          </div>
          {overallRating != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>{overallRating}</span>
              <Stars n={Math.round(overallRating)} />
              <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>({branchReviews.length} تقييم)</span>
            </div>
          )}
        </div>
        <Button variant="secondary" onClick={() => setAddOpen(true)}><Plus size={15} /> إضافة فرع</Button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {branchList.map((b) => (
          <div key={b.id} onClick={() => setActiveBranchId(b.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-full)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: (activeBranch?.id === b.id) ? 'var(--brand-500)' : '#fff',
            color: (activeBranch?.id === b.id) ? '#fff' : 'var(--text-secondary)',
            border: '1px solid ' + ((activeBranch?.id === b.id) ? 'var(--brand-500)' : 'var(--border-default)'),
          }}>
            <MapPin size={13} /> {b.name}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {branchReviews.length === 0 && (
          <Card><div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>لا توجد تقييمات لهذا الفرع بعد</div></Card>
        )}
        {branchReviews.map((r) => {
          const ticket = ticketByReviewId[r.id]
          return (
            <Card key={r.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--slate-200)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.reviewer_name}</div>
                    <Stars n={r.rating} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{r.review_date.split('T')[0]}</span>
                  <Badge tone={STATUS_TONE[r.reply_status]}>{STATUS_LABEL[r.reply_status]}</Badge>
                </div>
              </div>
              {r.comment && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 10 }}>{r.comment}</div>}

              {r.reply_text ? (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)' }}>
                  <b>{r.replied_by === 'ai' ? 'رد الذكاء الاصطناعي: ' : 'ردك: '}</b>{r.reply_text}
                </div>
              ) : (
                <>
                  {ticket && (
                    <div style={{
                      marginTop: 12, padding: 12, background: 'var(--danger-100)', borderRadius: 'var(--radius-md)',
                      fontSize: 12.5, color: 'var(--danger-500)', display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <b>تذكرة {ticket.priority === 'high' ? 'أولوية عالية' : 'مفتوحة'}:</b> {ticket.description}
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <textarea
                      placeholder="اكتب رداً على هذا التقييم..."
                      value={drafts[r.id] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                      style={{ flex: 1, minHeight: 44, padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontFamily: 'var(--font-arabic)', fontSize: 13, resize: 'vertical' }}
                    />
                    <Button size="sm" onClick={() => sendReply(r)}>إرسال الرد</Button>
                  </div>
                </>
              )}
            </Card>
          )
        })}
      </div>

      {renderAddDialog()}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, insetInlineStart: 24, zIndex: 100 }}>
          <Toast tone="success" title={toast.title} description={toast.description} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  )
}
