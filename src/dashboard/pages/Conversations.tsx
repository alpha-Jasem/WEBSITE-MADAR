import { ConversationsExperience } from './conversations/ConversationsExperience'

// Unified list of everything the agent handled (calls, web and WhatsApp chats, and the
// WhatsApp messages sent per number). ?id=<key> opens one; ?filter=needs|phone|whatsapp|web.
export function DashboardV2Conversations() {
  return <ConversationsExperience mode="all" />
}
