export const sendWhatsAppMessage = (phone: string, message: string) => {
  const cleaned = phone.replace(/\D/g, '')
  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export const notifyAdminNewLead = (leadData: {
  name: string
  service: string
  phone: string
  email: string
}) => {
  const adminPhone = import.meta.env.VITE_ADMIN_WHATSAPP || '966546666005'
  const message = [
    'عميل جديد من الموقع',
    '',
    `الاسم: ${leadData.name}`,
    `البريد: ${leadData.email || 'غير محدد'}`,
    `الجوال: ${leadData.phone}`,
    `الخدمة: ${leadData.service}`,
    '',
    'تم الاستلام من الموقع الإلكتروني.',
  ].join('\n')
  sendWhatsAppMessage(adminPhone, message)
}

export const openWhatsAppChat = (message?: string) => {
  const adminPhone = import.meta.env.VITE_ADMIN_WHATSAPP || '966546666005'
  const defaultMessage = message || 'مرحباً، أريد الاستفسار عن مدار OS للمغاسل.'
  sendWhatsAppMessage(adminPhone, defaultMessage)
}
