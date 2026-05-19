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
  const message = `🔔 *عميل جديد!*\n\n👤 الاسم: ${leadData.name}\n📧 البريد: ${leadData.email}\n📱 الجوال: ${leadData.phone}\n💼 الخدمة: ${leadData.service}\n\n_تم الاستلام من الموقع الإلكتروني_`
  sendWhatsAppMessage(adminPhone, message)
}

export const openWhatsAppChat = (message?: string) => {
  const adminPhone = import.meta.env.VITE_ADMIN_WHATSAPP || '966546666005'
  const defaultMessage = message || 'مرحباً، أرغب بالاستفسار عن خدماتكم'
  sendWhatsAppMessage(adminPhone, defaultMessage)
}
