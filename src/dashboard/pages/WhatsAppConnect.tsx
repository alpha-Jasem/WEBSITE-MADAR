import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Card, Button } from '@/dashboard/components/primitives'
import { NightPage, PageHead, CardTitle, EmptyLine, Chip, type ChipTone } from './shared/night'
import { useWaStatus } from '@/lib/queries/whatsappStatus'

const CSS = `
.wa-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 0; border-bottom: 1px solid var(--line); }
.wa-row:last-child { border-bottom: 0; }
.wa-row .main { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 2px; }
.wa-row b { font-size: 14px; font-weight: 600; color: var(--ink); }
.wa-row small { font-size: 12.5px; color: var(--muted); line-height: 1.7; }
.wa-num { direction: ltr; unicode-bidi: embed; font-family: var(--font-numeral); }
.wa-steps { margin: 0; padding-inline-start: 20px; display: flex; flex-direction: column; gap: 8px; font-size: 13.5px; color: var(--text-primary); line-height: 1.8; }
.wa-note { font-size: 12.5px; color: var(--text-tertiary); line-height: 1.8; margin: 10px 0 0; }
`

export function DashboardV2WhatsAppConnect() {
  const { isDemo, companyName } = useWorkspace()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const { status, error, loading, reload } = useWaStatus(isDemo)

  let tone: ChipTone = 'warn'
  let headline = 'جارِ قراءة الحالة...'
  if (status) {
    if (!status.agent_linked) { tone = 'bad'; headline = 'ما فيه وكيل مربوط بحسابك' }
    else if (!status.connected) { tone = 'bad'; headline = 'ما انربط رقم واتساب بالوكيل' }
    else if (status.token_expired) { tone = 'bad'; headline = 'انتهى ربط ميتا، لازم يتجدد' }
    else if (status.messaging === false) { tone = 'warn'; headline = 'الرقم مربوط لكن الرسائل متوقفة' }
    else { tone = 'ok'; headline = 'الرقم مربوط والوكيل يرد' }
  }

  return (
    <NightPage>
      <style>{CSS}</style>
      <PageHead
        title="ربط واتساب" sub={`رقم واتساب ${companyName || 'نشاطك'} الرسمي، اللي يرد عليه الوكيل ويرسل منه فريقك`}
        actions={<Button variant="secondary" onClick={() => void reload()}><RefreshCw size={14} /> تحديث</Button>}
      />

      <Card>
        <CardTitle>الحالة</CardTitle>
        {error && <EmptyLine>{error}</EmptyLine>}
        {!error && loading && !status && <EmptyLine>جارِ التحميل...</EmptyLine>}
        {status && (
          <>
            <div className="wa-row">
              <div className="main">
                <b>رقم الاستقبال والرد</b>
                <small>{status.connected ? <>الرقم: <span className="wa-num">{status.phone_number || '—'}</span>{status.name ? ` · ${status.name}` : ''}</> : 'ما فيه رقم مربوط للوكيل'}</small>
              </div>
              <Chip tone={tone}>{headline}</Chip>
            </div>
            <div className="wa-row">
              <div className="main">
                <b>رسائل القوالب والحملات والأتمتة</b>
                <small>{status.connected && !status.token_expired ? 'تشتغل من نفس الرقم.' : 'تتوقف لين يتربط الرقم.'}</small>
              </div>
              <Chip tone={status.connected && !status.token_expired ? 'ok' : 'bad'}>{status.connected && !status.token_expired ? 'شغالة' : 'متوقفة'}</Chip>
            </div>
            <div className="wa-row">
              <div className="main">
                <b>الرد الحر من صندوق المحادثات</b>
                <small>{status.can_reply ? 'مفعّل: فريقك يكتب للعميل مباشرة خلال 24 ساعة من آخر رسالة منه.' : 'غير مفعّل: يحتاج مفتاح وصول من حساب ميتا للأعمال، وفريق مدار يضيفه لك.'}</small>
              </div>
              <Chip tone={status.can_reply ? 'ok' : 'warn'}>{status.can_reply ? 'مفعّل' : 'غير مفعّل'}</Chip>
            </div>
          </>
        )}
      </Card>

      {status && !(status.connected && !status.token_expired) && (
        <Card>
          <CardTitle>كيف نربط الرقم</CardTitle>
          <ol className="wa-steps">
            <li>جهّز حساب ميتا للأعمال (Business) باسم نشاطك، وتكون أنت مدير فيه.</li>
            <li>جهّز رقم جوال جديد للنشاط يوصله رمز تحقق. لازم ما يكون مسجّل على واتساب العادي، ولا مستخدم في نظام ثاني.</li>
            <li>تواصل مع فريق مدار، ويدخلون بحسابك على ميتا ويربطون الرقم بوكيلك.</li>
            <li>ينعتمد لك قالب رسالة واحد على الأقل من ميتا، عشان الحملات والأتمتة تبدأ المحادثة.</li>
          </ol>
          <p className="wa-note">كل رقم يخدم وكيل واحد. إذا الرقم مستخدم في مشروع ثاني، نحتاج رقم جديد لهالحساب.</p>
        </Card>
      )}

      {status?.connected && !status.token_expired && (
        <Card>
          <CardTitle>وين أستخدمه؟</CardTitle>
          <div className="wa-row"><div className="main"><b>القوالب والإرسال</b><small>أضف قوالب ميتا المعتمدة وأرسل منها.</small></div><Link to={`${base}/outreach`}><Button variant="secondary" size="sm">افتح</Button></Link></div>
          <div className="wa-row"><div className="main"><b>الحملات</b><small>رسائل جماعية أو رحلة عميل على الرقم نفسه.</small></div><Link to={`${base}/campaigns`}><Button variant="secondary" size="sm">افتح</Button></Link></div>
          <div className="wa-row"><div className="main"><b>الأتمتة</b><small>رسائل تلقائية عند الطلب أو الفورم أو رجوع العميل.</small></div><Link to={`${base}/connect`}><Button variant="secondary" size="sm">افتح</Button></Link></div>
        </Card>
      )}
    </NightPage>
  )
}
