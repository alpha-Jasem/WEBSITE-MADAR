import { useMemo, useState } from 'react'
import { Search, ShoppingBag, ShoppingCart, ExternalLink } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useSallaOrders, useSallaCarts } from '@/lib/dashboardQueries'
import { SAUDI_TZ } from '@/lib/saudiTime'
import type { SallaOrder, SallaCart } from '@/types/dashboard'
import { Card, Input } from '@/dashboard/components/primitives'
import { NightPage, PageHead, Seg, Kpi, Chip, useIsNarrow, fmtNum, type ChipTone } from './shared/night'
import { EmptyState, SkeletonRows, Avatar, ContactActions } from '@/dashboard/components/uiExtras'

type View = 'orders' | 'carts'
type OrderFilter = 'all' | 'active' | 'shipping' | 'done' | 'closed'
type CartFilter = 'all' | 'abandoned' | 'purchased'

const ORDER_FILTERS: readonly (readonly [OrderFilter, string])[] = [
  ['all', 'الكل'], ['active', 'قيد المعالجة'], ['shipping', 'في الشحن'], ['done', 'مكتملة'], ['closed', 'ملغية ومرتجعة'],
]
const CART_FILTERS: readonly (readonly [CartFilter, string])[] = [
  ['all', 'الكل'], ['abandoned', 'متروكة'], ['purchased', 'تم شراؤها'],
]

/** Salla's own status slugs, grouped for the filter and the chip colour. */
const STATUS_GROUP: Record<string, Exclude<OrderFilter, 'all'>> = {
  under_review: 'active', in_progress: 'active', payment_pending: 'active',
  shipped: 'shipping', delivering: 'shipping',
  delivered: 'done', completed: 'done',
  canceled: 'closed', restored: 'closed', restoring: 'closed',
}
const GROUP_TONE: Record<Exclude<OrderFilter, 'all'>, ChipTone> = { active: 'warn', shipping: 'info', done: 'ok', closed: 'bad' }

const PAYMENT_LABEL: Record<string, string> = {
  mada: 'مدى', visa: 'فيزا', mastercard: 'ماستركارد', apple_pay: 'Apple Pay', stc_pay: 'STC Pay',
  cod: 'عند الاستلام', bank: 'تحويل بنكي', credit_card: 'بطاقة ائتمانية', customer_wallet: 'المحفظة', tabby: 'تابي', tamara: 'تمارا',
}

const orderGroup = (o: SallaOrder) => STATUS_GROUP[o.status_slug || ''] ?? 'active'

function money(n: number | null, currency?: string | null) {
  if (n == null) return '—'
  const unit = !currency || currency === 'SAR' ? 'ر.س' : currency
  return `${fmtNum(Math.round(n))} ${unit}`
}

function fmtWhen(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-GB', { timeZone: SAUDI_TZ, day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('en-US', { timeZone: SAUDI_TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .replace('AM', 'ص').replace('PM', 'م')
  return `${day} · ${time}`
}

function fmtAge(iso: string | null) {
  if (!iso) return '—'
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `قبل ${fmtNum(Math.max(mins, 1))} دقيقة`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `قبل ${fmtNum(hours)} ساعة`
  const days = Math.round(hours / 24)
  return days === 1 ? 'أمس' : `قبل ${fmtNum(days)} أيام`
}

export function DashboardV2Orders() {
  const { companyId, isDemo } = useWorkspace()
  const { data: orders, loading: ordersLoading } = useSallaOrders(companyId, isDemo)
  const { data: carts, loading: cartsLoading } = useSallaCarts(companyId, isDemo)
  const loading = ordersLoading || cartsLoading
  const narrow = useIsNarrow()

  const [view, setView] = useState<View>('orders')
  const [q, setQ] = useState('')
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all')
  const [cartFilter, setCartFilter] = useState<CartFilter>('all')

  const allOrders = useMemo(() => orders || [], [orders])
  const allCarts = useMemo(() => carts || [], [carts])

  const kpi = useMemo(() => {
    const counted = allOrders.filter((o) => orderGroup(o) !== 'closed')
    const revenue = counted.reduce((s, o) => s + (o.total || 0), 0)
    const open = allCarts.filter((c) => c.status !== 'purchased')
    const won = allCarts.filter((c) => c.status === 'purchased')
    return {
      orders: allOrders.length,
      revenue,
      avg: counted.length ? revenue / counted.length : 0,
      openCarts: open.length,
      openValue: open.reduce((s, c) => s + (c.total || 0), 0),
      recovered: allCarts.length ? Math.round((won.length / allCarts.length) * 100) : 0,
      recoveredValue: won.reduce((s, c) => s + (c.total || 0), 0),
    }
  }, [allOrders, allCarts])

  const needle = q.trim().toLowerCase()
  const shownOrders = useMemo(() => allOrders.filter((o) => {
    if (orderFilter !== 'all' && orderGroup(o) !== orderFilter) return false
    if (!needle) return true
    return [o.customer_name, o.customer_mobile, o.reference_id].some((v) => (v || '').toLowerCase().includes(needle))
  }), [allOrders, orderFilter, needle])
  const shownCarts = useMemo(() => allCarts.filter((c) => {
    if (cartFilter === 'abandoned' && c.status === 'purchased') return false
    if (cartFilter === 'purchased' && c.status !== 'purchased') return false
    if (!needle) return true
    return [c.customer_name, c.customer_mobile].some((v) => (v || '').toLowerCase().includes(needle))
  }), [allCarts, cartFilter, needle])

  const empty = !loading && allOrders.length === 0 && allCarts.length === 0

  return (
    <NightPage>
      <PageHead
        title="الطلبات"
        sub={loading ? 'جارِ التحميل…' : `${fmtNum(kpi.orders)} طلب · ${fmtNum(kpi.openCarts)} سلة متروكة · تتحدث تلقائيًا من حسابك في سلة`}
      />

      <div className="np-kpis">
        <Kpi label="الطلبات" value={fmtNum(kpi.orders)} hint="آخر ما وصلنا من سلة" />
        <Kpi label="قيمة الطلبات" value={money(kpi.revenue)} hint={`متوسط الطلب ${money(kpi.avg)}`} />
        <Kpi label="سلات متروكة" value={fmtNum(kpi.openCarts)} hint={`بقيمة ${money(kpi.openValue)}`} />
        <Kpi label="سلات تحوّلت لطلب" value={`${fmtNum(kpi.recovered)}%`} hint={`بقيمة ${money(kpi.recoveredValue)}`} trend={kpi.recovered > 0 ? 'up' : 'flat'} />
      </div>

      {empty ? (
        <Card style={{ padding: 0 }}>
          <EmptyState
            icon={<ShoppingBag size={20} />}
            title="لا توجد طلبات بعد"
            description="ثبّت تطبيق مدار AI من متجر تطبيقات سلة، وتظهر هنا طلباتك وسلاتك المتروكة تلقائيًا."
          />
        </Card>
      ) : (
        <>
          <div className="np-filters">
            <Seg
              label="العرض" value={view} onChange={(v) => { setView(v); setQ('') }}
              options={[
                ['orders', <><ShoppingBag size={14} /> الطلبات <span className="np-num">{fmtNum(allOrders.length)}</span></>],
                ['carts', <><ShoppingCart size={14} /> السلات المتروكة <span className="np-num">{fmtNum(allCarts.length)}</span></>],
              ] as const}
            />
            <Input
              placeholder={view === 'orders' ? 'بحث بالاسم أو الجوال أو رقم الطلب' : 'بحث بالاسم أو الجوال'}
              icon={<Search size={15} />} value={q} onChange={(e) => setQ(e.target.value)}
              style={{ width: narrow ? '100%' : 280 }}
            />
            {view === 'orders'
              ? <Seg label="حالة الطلب" value={orderFilter} onChange={setOrderFilter} options={ORDER_FILTERS} />
              : <Seg label="حالة السلة" value={cartFilter} onChange={setCartFilter} options={CART_FILTERS} />}
            <span className="np-aside np-num">
              {view === 'orders' ? `${fmtNum(shownOrders.length)} من ${fmtNum(allOrders.length)}` : `${fmtNum(shownCarts.length)} من ${fmtNum(allCarts.length)}`}
            </span>
          </div>

          <Card style={{ padding: 0 }}>
            {loading && <SkeletonRows rows={6} columns={7} />}
            {!loading && view === 'orders' && (shownOrders.length > 0
              ? <OrdersTable rows={shownOrders} narrow={narrow} />
              : <EmptyState icon={<ShoppingBag size={20} />} title="لا توجد طلبات مطابقة" description="جرّب تغيير كلمة البحث أو الفلتر." />)}
            {!loading && view === 'carts' && (shownCarts.length > 0
              ? <CartsTable rows={shownCarts} narrow={narrow} />
              : <EmptyState icon={<ShoppingCart size={20} />} title="لا توجد سلات مطابقة" description="جرّب تغيير كلمة البحث أو الفلتر." />)}
          </Card>
        </>
      )}
    </NightPage>
  )
}

function OrdersTable({ rows, narrow }: { rows: SallaOrder[]; narrow: boolean }) {
  return (
    <div className="np-table-wrap">
      <table className="np-table" style={{ minWidth: 760 }}>
        <thead>
          <tr>
            <th>رقم الطلب</th><th>العميل</th><th>الجوال</th><th>الحالة</th><th>الدفع</th><th>الإجمالي</th><th>التاريخ</th><th>تواصل</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const name = o.customer_name || 'عميل'
            const group = orderGroup(o)
            return (
              <tr key={`${o.merchant_id}:${o.order_id}`}>
                <td className="strong np-num">
                  {o.customer_url
                    ? <a href={o.customer_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>#{o.reference_id || o.order_id}<ExternalLink size={12} /></a>
                    : <>#{o.reference_id || o.order_id}</>}
                </td>
                <td className="strong"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={name} size={30} />{name}</span></td>
                <td className="np-num" dir="ltr" style={{ textAlign: 'end' }}>{o.customer_mobile || '—'}</td>
                <td><Chip tone={GROUP_TONE[group]}>{o.status_name || 'قيد المعالجة'}</Chip></td>
                <td>{o.payment_method ? (PAYMENT_LABEL[o.payment_method] || o.payment_method) : '—'}</td>
                <td className="np-num strong">{money(o.total, o.currency)}</td>
                <td className="np-num">{fmtWhen(o.order_created_at)}</td>
                <td><ContactActions size={narrow ? 40 : 28} phone={o.customer_mobile} message={`مرحباً ${name}، بخصوص طلبك رقم ${o.reference_id || o.order_id}`} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CartsTable({ rows, narrow }: { rows: SallaCart[]; narrow: boolean }) {
  return (
    <div className="np-table-wrap">
      <table className="np-table" style={{ minWidth: 700 }}>
        <thead>
          <tr>
            <th>العميل</th><th>الجوال</th><th>قيمة السلة</th><th>المنتجات</th><th>الحالة</th><th>آخر نشاط</th><th>تواصل</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const name = c.customer_name || 'زائر'
            const bought = c.status === 'purchased'
            return (
              <tr key={`${c.merchant_id}:${c.cart_id}`}>
                <td className="strong"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={name} size={30} />{name}</span></td>
                <td className="np-num" dir="ltr" style={{ textAlign: 'end' }}>{c.customer_mobile || '—'}</td>
                <td className="np-num strong">{money(c.total, c.currency)}</td>
                <td className="np-num">{c.items_count != null ? fmtNum(c.items_count) : '—'}</td>
                <td><Chip tone={bought ? 'ok' : 'warn'}>{bought ? 'تم الشراء' : 'متروكة'}</Chip></td>
                <td className="np-num">{fmtAge(bought ? c.purchased_at : c.cart_created_at)}</td>
                <td>
                  {bought ? null : (
                    <ContactActions
                      size={narrow ? 40 : 28} phone={c.customer_mobile}
                      message={`مرحباً ${name}، سلتك لسا بانتظارك${c.checkout_url ? `: ${c.checkout_url}` : ''}`}
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
