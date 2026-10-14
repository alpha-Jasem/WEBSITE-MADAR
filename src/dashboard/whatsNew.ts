/**
 * Release notes for the "ما الجديد" popup, newest first.
 *
 * `video` / `poster` are paths under /public. Only set them once the file is
 * actually there; until then the popup shows a "الفيديو قريبًا" placeholder.
 * Planned files: /whats-new/agent-analytics.mp4, /whats-new/auto-tags.mp4,
 * /whats-new/call-recording.mp4, /whats-new/agent-settings.mp4.
 *
 * `link` is relative to the dashboard base (e.g. 'agent-analytics').
 * Adding a new item at the top re-opens the popup once for every user.
 */
export interface Release {
  id: string
  /** ISO date, shown as a short Arabic date. */
  date: string
  title: string
  description: string
  video?: string
  poster?: string
  link?: string
}

export const RELEASES: Release[] = [
  {
    id: '2026-10-agent-analytics',
    date: '2026-10-12',
    title: 'تحليلات الوكيل',
    description: 'صفحة وحدة تشوف فيها وش يسألون عملاؤك، نسبة المحادثات اللي نجح فيها الوكيل، انطباع العملاء، وتكلفة كل محادثة.',
    link: 'agent-analytics',
  },
  {
    id: '2026-10-auto-tags',
    date: '2026-10-12',
    title: 'وسوم المحادثات التلقائية',
    description: 'الوكيل يوسم كل محادثة تلقائيًا من ملخصها، بألوان تفرّق بينها. تقدر تغيّر اسم أي وسم أو لونه، تطفيه، أو تضيف وسومك أنت.',
    link: 'conversations',
  },
  {
    id: '2026-10-call-recording',
    date: '2026-10-12',
    title: 'تسجيل المكالمات والتحليل في كل محادثة',
    description: 'اسمع تسجيل المكالمة من نفس المحادثة، واقرأ تحليلها: هل نجحت، وش جمع الوكيل من بيانات، ووش الخطوة الجاية.',
    link: 'conversations',
  },
  {
    id: '2026-10-agent-settings',
    date: '2026-10-12',
    title: 'إعدادات الوكيل ومزامنة المعرفة',
    description: 'غيّر اسم الوكيل وطريقة رده وساعات عمله من مكان واحد، وأي معلومة تضيفها لقاعدة المعرفة توصله تلقائيًا.',
    link: 'agents',
  },
]
