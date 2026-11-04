import type { QtApproval, QtCustomer, QtEvent, QtProduct, QtQuote, QtSettings, QtVersion } from './types'
import { lineFromProduct } from './matching'

/** Demo only: an office furniture and equipment supplier. Every name and number here is sample data. */

const ago = (days: number, hours = 0) => new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString()
const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)

export const DEMO_SETTINGS: QtSettings = {
  currency: 'SAR',
  vatRate: 15,
  validityDays: 14,
  autoIssueMaxTotal: 50000,
  maxDiscountPct: 10,
  minMarginPct: 18,
  priceMaxAgeDays: 90,
  paymentTerms: '50% عند التعميد، والباقي عند التسليم',
  deliveryTerms: 'التسليم خلال 10 أيام عمل داخل جدة',
  quotePrefix: 'Q',
}

export const DEMO_PRODUCTS: QtProduct[] = [
  { id: 'p1', sku: 'CH-200', name: 'كرسي مكتب شبكي', nameEn: 'Mesh office chair', unit: 'حبة', unitPrice: 640, unitCost: 410, priceSource: 'قائمة الأسعار 2026', priceUpdatedAt: ago(20), active: true },
  { id: 'p2', sku: 'CH-310', name: 'كرسي مدير جلد', nameEn: 'Executive leather chair', unit: 'حبة', unitPrice: 1450, unitCost: 980, priceSource: 'قائمة الأسعار 2026', priceUpdatedAt: ago(20), active: true },
  { id: 'p3', sku: 'DS-140', name: 'مكتب عمل 140 سم', nameEn: 'Work desk 140cm', unit: 'حبة', unitPrice: 1180, unitCost: 760, priceSource: 'قائمة الأسعار 2026', priceUpdatedAt: ago(20), active: true },
  { id: 'p4', sku: 'DS-180', name: 'مكتب مدير 180 سم', nameEn: 'Executive desk 180cm', unit: 'حبة', unitPrice: 2900, unitCost: 1950, priceSource: 'قائمة الأسعار 2026', priceUpdatedAt: ago(20), active: true },
  { id: 'p5', sku: 'MT-27', name: 'شاشة 27 بوصة', nameEn: '27-inch monitor', unit: 'حبة', unitPrice: 1090, unitCost: 905, priceSource: 'المورد: تقنية الخليج', priceUpdatedAt: ago(120), active: true },
  { id: 'p6', sku: 'PR-L5', name: 'طابعة ليزر', nameEn: 'Laser printer', unit: 'حبة', unitPrice: 1350, unitCost: 1010, priceSource: 'المورد: تقنية الخليج', priceUpdatedAt: ago(35), active: true },
  { id: 'p7', sku: 'CB-4', name: 'خزانة ملفات 4 أدراج', nameEn: '4-drawer filing cabinet', unit: 'حبة', unitPrice: 780, unitCost: 500, priceSource: 'قائمة الأسعار 2026', priceUpdatedAt: ago(20), active: true },
  { id: 'p8', sku: 'MT-RM', name: 'طاولة اجتماعات 8 أشخاص', nameEn: 'Meeting table (8 seats)', unit: 'حبة', unitPrice: 4200, unitCost: 2900, priceSource: 'قائمة الأسعار 2026', priceUpdatedAt: ago(20), active: true },
  { id: 'p9', sku: 'IN-01', name: 'تركيب وتوصيل', nameEn: 'Delivery & installation', unit: 'زيارة', unitPrice: 350, unitCost: 150, priceSource: 'خدمة', priceUpdatedAt: ago(10), active: true },
  { id: 'p10', sku: 'SF-3', name: 'كنب انتظار 3 مقاعد', nameEn: '3-seat waiting sofa', unit: 'حبة', unitPrice: null, unitCost: null, priceSource: 'بانتظار تسعير المورد', priceUpdatedAt: null, active: true },
]

export const DEMO_CUSTOMERS: QtCustomer[] = [
  { id: 'c1', name: 'شركة البناء الحديث', contactName: 'م. سامي', phone: '966500000001', email: 'procurement@example.com', createdAt: ago(40) },
  { id: 'c2', name: 'مجمع عيادات الرعاية', contactName: 'أ. هند', phone: '966500000002', createdAt: ago(25) },
  { id: 'c3', name: 'مكتب المحاماة المتحد', contactName: 'أ. فيصل', phone: '966500000003', createdAt: ago(12) },
  { id: 'c4', name: 'أكاديمية الأفق', contactName: 'أ. نورة', phone: '966500000004', createdAt: ago(4) },
]

const P = (id: string) => DEMO_PRODUCTS.find((p) => p.id === id)!

function q(partial: Partial<QtQuote> & Pick<QtQuote, 'id' | 'number' | 'customerId' | 'lines'>): QtQuote {
  return {
    ownerName: 'خالد', docStatus: 'draft', workState: 'none', discountPct: 0, vatRate: 15, currency: 'SAR',
    validUntil: inDays(14), paymentTerms: DEMO_SETTINGS.paymentTerms, deliveryTerms: DEMO_SETTINGS.deliveryTerms,
    lang: 'ar', version: 1, prepStartedAt: null, prepFinishedAt: null, issuedAuto: false,
    publicToken: `demo-${partial.id}`, createdAt: ago(1), updatedAt: ago(1), ...partial,
  }
}

export const DEMO_QUOTES: QtQuote[] = [
  q({ id: 'q1', number: 'Q-1041', customerId: 'c1', docStatus: 'accepted', issuedAuto: true, version: 2,
    lines: [lineFromProduct(P('p1'), 40, '40 كرسي مكتب'), lineFromProduct(P('p3'), 40, '40 مكتب 140'), lineFromProduct(P('p9'), 2, 'تركيب')],
    prepStartedAt: ago(9, 2), prepFinishedAt: new Date(new Date(ago(9, 2)).getTime() + 74000).toISOString(),
    acceptedAt: ago(7), acceptedBy: 'م. سامي', acceptedVersion: 2, createdAt: ago(9, 2), updatedAt: ago(7) }),
  q({ id: 'q2', number: 'Q-1042', customerId: 'c2', docStatus: 'sent', issuedAuto: true,
    lines: [lineFromProduct(P('p7'), 6, 'خزانة ملفات'), lineFromProduct(P('p1'), 12, 'كراسي شبك')],
    prepStartedAt: ago(3, 5), prepFinishedAt: new Date(new Date(ago(3, 5)).getTime() + 58000).toISOString(), createdAt: ago(3, 5), updatedAt: ago(3) }),
  q({ id: 'q3', number: 'Q-1043', customerId: 'c3', docStatus: 'draft', workState: 'awaiting_approval', discountPct: 15,
    lines: [lineFromProduct(P('p4'), 3, 'مكتب مدير'), lineFromProduct(P('p2'), 3, 'كرسي مدير'), lineFromProduct(P('p8'), 1, 'طاولة اجتماعات')],
    prepStartedAt: ago(0, 3), prepFinishedAt: new Date(new Date(ago(0, 3)).getTime() + 66000).toISOString(), createdAt: ago(0, 3), updatedAt: ago(0, 3) }),
  q({ id: 'q4', number: 'Q-1044', customerId: 'c4', docStatus: 'draft', workState: 'needs_info',
    lines: [
      lineFromProduct(P('p1'), 25, '25 كرسي'),
      { ...lineFromProduct(P('p10'), 2, 'كنب انتظار'), unitPrice: null },
      { id: 'l_x', requested: 'سبورة ذكية 75 بوصة', sourceRef: 'ملف: طلب-الأكاديمية.xlsx سطر 3', productId: null, description: 'سبورة ذكية 75 بوصة', unit: '', qty: 2, unitPrice: null, unitCost: null, discountPct: 0, candidates: [] },
    ],
    prepStartedAt: ago(0, 1), createdAt: ago(0, 1), updatedAt: ago(0, 1) }),
  q({ id: 'q5', number: 'Q-1039', customerId: 'c2', docStatus: 'rejected', issuedAuto: false,
    lines: [lineFromProduct(P('p6'), 3, 'طابعات')],
    prepStartedAt: ago(16), prepFinishedAt: new Date(new Date(ago(16)).getTime() + 95000).toISOString(), createdAt: ago(16), updatedAt: ago(12) }),
  q({ id: 'q6', number: 'Q-1037', customerId: 'c1', docStatus: 'expired', issuedAuto: true, validUntil: inDays(-3),
    lines: [lineFromProduct(P('p9'), 1, 'تركيب')],
    prepStartedAt: ago(20), prepFinishedAt: new Date(new Date(ago(20)).getTime() + 41000).toISOString(), createdAt: ago(20), updatedAt: ago(3) }),
]

export const DEMO_APPROVALS: QtApproval[] = [
  { id: 'a1', quoteId: 'q3', reasons: ['خصم العرض 15% أعلى من 10%'], status: 'pending', requestedAt: ago(0, 3) },
]

export const DEMO_VERSIONS: QtVersion[] = [
  { quoteId: 'q1', version: 1, note: 'أصدرها الوكيل تلقائيًا', by: 'الوكيل', at: ago(9, 2), total: 0 },
  { quoteId: 'q1', version: 2, note: 'طلب العميل إضافة التركيب', by: 'خالد', at: ago(8), total: 0 },
]

export const DEMO_EVENTS: QtEvent[] = [
  { id: 'e1', quoteId: 'q1', kind: 'accepted', body: 'قبل العميل النسخة 2', actor: 'م. سامي', at: ago(7) },
  { id: 'e2', quoteId: 'q2', kind: 'sent', body: 'أُرسل رابط العرض للعميل', actor: 'الوكيل', at: ago(3) },
  { id: 'e3', quoteId: 'q3', kind: 'approval', body: 'طلب موافقة: خصم 15%', actor: 'الوكيل', at: ago(0, 3) },
  { id: 'e4', quoteId: 'q4', kind: 'agent', body: 'بانتظار معلومة: سبورة ذكية غير موجودة في الكتالوج، وكنب الانتظار بدون سعر', actor: 'الوكيل', at: ago(0, 1) },
]
