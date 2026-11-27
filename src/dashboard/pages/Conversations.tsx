import { ConversationsExperience } from './conversations/ConversationsExperience'
import { useState } from 'react'
import { Settings } from 'lucide-react'
import { DashboardV2WhatsAppConnect, WhatsAppSettingsDialog } from './WhatsAppConnect'
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
  const { isDemo, can, isOwner } = useWorkspace()
  const { status, loading, reload } = useWaStatus(isDemo)
  const [settings, setSettings] = useState(false)
  if (loading && !status) return <NightPage><PageHead title="واتساب" /><Card style={{ padding: 16 }}><div className="np-empty">جارِ التحميل…</div></Card></NightPage>
  if (status?.can_reply) return (
    <>
      <ConversationsExperience mode="whatsapp" actions={isOwner ? <button type="button" className="nx-btn" onClick={() => setSettings(true)}><Settings /> الإعدادات</button> : null} />
      <WhatsAppSettingsDialog open={settings} onClose={() => setSettings(false)} status={status} reload={reload} />
    </>
  )
  if (can('integrations.manage')) return <DashboardV2WhatsAppConnect />
  return (
    <NightPage>
      <PageHead title="واتساب" />
      <Card style={{ padding: 16 }}><div className="np-empty">صندوق واتساب غير مرتبط. اطلب من مالك الحساب يربط رقم الواتساب بحساب ميتا.</div></Card>
    </NightPage>
  )
}
