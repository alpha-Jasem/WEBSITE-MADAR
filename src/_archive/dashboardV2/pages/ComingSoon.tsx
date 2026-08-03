import { Wrench, LayoutGrid, PhoneIncoming, PhoneOutgoing, Radio } from 'lucide-react'
import { Button } from '@/_archive/dashboardV2/components/primitives'
import { useToast } from '@/_archive/dashboardV2/components/uiExtras'
import { ShellListPage } from './ShellListPage'

export const DashboardV2Tools = () => (
  <ShellListPage
    title="الأدوات" subtitle="أدوات مخصصة يستخدمها الوكيل الذكي أثناء المكالمات (حجز، استعلام، تحويل)."
    searchPlaceholder="ابحث عن أداة بالاسم..." createLabel="أداة جديدة"
    emptyTitle="لا توجد أدوات بعد" emptyDescription="أنشئ أداة لتمكين الوكيل من تنفيذ إجراء HTTP بمعطيات محددة."
    icon={<Wrench size={20} />}
  />
)

export const DashboardV2AnalysisGroups = () => (
  <ShellListPage
    title="مجموعات التحليل" subtitle="تقسيم المكالمات والمحادثات لمجموعات تحليل مخصصة تُربط بوكيل أو أكثر."
    searchPlaceholder="ابحث عن مجموعة بالاسم..." createLabel="مجموعة جديدة"
    emptyTitle="لا توجد مجموعات تحليل بعد" emptyDescription="أنشئ أول مجموعة تحليل لتنظيم نتائج المكالمات."
    icon={<LayoutGrid size={20} />}
  />
)

export const DashboardV2InboundServices = () => (
  <ShellListPage
    title="الخدمات الواردة" subtitle="توجيه المكالمات الواردة لوكلاء مساحة العمل — بيانات SIP وقواعد التوجيه."
    searchPlaceholder="ابحث بالاسم أو الرقم..." createLabel="خدمة واردة جديدة"
    emptyTitle="لا توجد خدمات واردة بعد" emptyDescription="أنشئ خط SIP وارد، ثم اربطه بوكيل أو أكثر للرد على المكالمات."
    icon={<PhoneIncoming size={20} />}
  />
)

export const DashboardV2OutboundServices = () => {
  const pushToast = useToast()
  return (
    <ShellListPage
      title="الخدمات الصادرة" subtitle="إدارة قنوات الاتصال الصادر المستخدمة للتذكيرات والحملات."
      searchPlaceholder="ابحث بالاسم أو الرقم..." createLabel="خدمة صادرة جديدة"
      emptyTitle="لا توجد خدمات صادرة بعد" emptyDescription="أنشئ خدمة SIP صادرة لبدء الاتصال من مساحة العمل."
      icon={<PhoneOutgoing size={20} />}
      secondaryAction={<Button variant="secondary" onClick={() => pushToast({ kind: 'info', title: 'الحملات قادمة قريبًا' })}><Radio size={14} /> الحملات</Button>}
    />
  )
}
