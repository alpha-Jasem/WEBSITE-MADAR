import { ConversationsExperience } from './conversations/ConversationsExperience'
import { DashboardV2WhatsAppConnect } from './WhatsAppConnect'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useWaStatus } from '@/lib/queries/whatsappStatus'
import { NightPage, PageHead } from './shared/night'
import { Card } from '@/dashboard/components/primitives'

// The site chat page: only conversations from the website chat. ?id=<key> opens one.
export function DashboardV2Conversations() {
  return <ConversationsExperience mode="web" />
}

/** The WhatsApp page: the WhatsApp inbox once the business number is linked to Meta, the linking page until then. */
export function DashboardV2WhatsApp() {
  const { isDemo, can } = useWorkspace()
  const { status, loading } = useWaStatus(isDemo)
  if (loading && !status) return <NightPage><PageHead title="واتساب" /><Card style={{ padding: 16 }}><div className="np-empty">جارِ التحميل…</div></Card></NightPage>
  if (status?.can_reply) return <ConversationsExperience mode="whatsapp" />
  if (can('integrations.manage')) return <DashboardV2WhatsAppConnect />
  return (
    <NightPage>
      <PageHead title="واتساب" />
      <Card style={{ padding: 16 }}><div className="np-empty">صندوق واتساب غير مرتبط. اطلب من مالك الحساب يربط رقم الواتساب بحساب ميتا.</div></Card>
    </NightPage>
  )
}
