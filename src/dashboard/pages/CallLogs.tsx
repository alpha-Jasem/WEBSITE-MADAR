import { ConversationsExperience } from './conversations/ConversationsExperience'

// /call-logs keeps working: the same conversation list and detail, limited to the
// agent's calls, with an Excel export.
export function DashboardV2CallLogs() {
  return <ConversationsExperience mode="calls" />
}
