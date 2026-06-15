import { useEffect, useState } from 'react'
import { Key, Plus, Trash2, Copy, Check, Loader2, Globe, Activity, RefreshCw, Eye, EyeOff, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { generateApiKey } from '../../../lib/apiKeys'

type ApiKey = {
  id: string
  company_id: string
  name: string
  key_prefix: string
  permissions: string[]
  active: boolean
  last_used_at: string | null
  created_at: string
  company?: { name: string }
}

type WebhookEndpoint = {
  id: string
  company_id: string
  url: string
  events: string[]
  active: boolean
  last_triggered_at: string | null
  created_at: string
  company?: { name: string }
}

type Company = { id: string; name: string }

const PERM_OPTIONS = [
  { value: 'read:all',    label: 'قراءة الكل' },
  { value: 'write:all',   label: 'كتابة الكل' },
  { value: 'read:customers', label: 'قراءة العملاء' },
  { value: 'write:customers', label: 'إضافة عملاء' },
  { value: 'read:visits', label: 'قراءة الزيارات' },
  { value: 'write:visits', label: 'إضافة زيارات' },
]

const EVENT_OPTIONS = [
  { value: 'visit.created',       label: 'زيارة جديدة' },
  { value: 'queue.status_changed', label: 'تغيير حالة القائمة' },
  { value: 'daily.closed',        label: 'إغلاق اليوم' },
  { value: 'customer.created',    label: 'عميل جديد' },
]

function timeAgo(val?: string | null) {
  if (!val) return 'لم يُستخدم بعد'
  const days = Math.floor((Date.now() - new Date(val).getTime()) / 86400000)
  if (days === 0) return 'اليوم'
  if (days === 1) return 'أمس'
  return `منذ ${days} يوم`
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export function AdminAPI() {
  const [apiKeys, setApiKeys]     = useState<ApiKey[]>([])
  const [webhooks, setWebhooks]   = useState<WebhookEndpoint[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks'>('keys')

  // New key form
  const [showNewKey, setShowNewKey]       = useState(false)
  const [newKeyName, setNewKeyName]       = useState('مفتاح API')
  const [newKeyPerms, setNewKeyPerms]     = useState<string[]>(['read:all'])
  const [generatingKey, setGeneratingKey] = useState(false)
  const [revealedKey, setRevealedKey]     = useState<string | null>(null)
  const [copiedKey, setCopiedKey]         = useState(false)

  // New webhook form
  const [showNewWebhook, setShowNewWebhook]         = useState(false)
  const [newWhUrl, setNewWhUrl]                     = useState('')
  const [newWhEvents, setNewWhEvents]               = useState<string[]>(['visit.created'])
  const [savingWebhook, setSavingWebhook]           = useState(false)

  const [revoking, setRevoking] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [keysRes, webhooksRes] = await Promise.all([
      supabase.from('api_keys').select('*, company:companies(name)').order('created_at', { ascending: false }),
      supabase.from('webhook_endpoints').select('*, company:companies(name)').order('created_at', { ascending: false }),
    ])
    setApiKeys((keysRes.data ?? []) as ApiKey[])
    setWebhooks((webhooksRes.data ?? []) as WebhookEndpoint[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createKey = async () => {
    setGeneratingKey(true)
    const { raw, hash, prefix } = await generateApiKey()
    const { error } = await supabase.from('api_keys').insert({
      company_id: null,
      name: newKeyName.trim() || 'مفتاح API',
      key_prefix: prefix,
      key_hash: hash,
      permissions: ['read:all', 'write:all'],
      active: true,
    })
    setGeneratingKey(false)
    if (error) { alert('خطأ: ' + error.message); return }
    setRevealedKey(raw)
    setShowNewKey(false)
    setNewKeyName('مفتاح API')
    load()
  }

  const revokeKey = async (id: string) => {
    if (!confirm('تعطيل هذا المفتاح؟')) return
    setRevoking(id)
    await supabase.from('api_keys').update({ active: false }).eq('id', id)
    setRevoking(null)
    load()
  }

  const deleteKey = async (id: string) => {
    if (!confirm('حذف هذا المفتاح نهائياً؟')) return
    await supabase.from('api_keys').delete().eq('id', id)
    load()
  }

  const createWebhook = async () => {
    if (!newWhUrl.trim()) return
    setSavingWebhook(true)
    const { error } = await supabase.from('webhook_endpoints').insert({
      company_id: null,
      url: newWhUrl.trim(),
      events: newWhEvents,
    })
    setSavingWebhook(false)
    if (error) { alert('خطأ: ' + error.message); return }
    setShowNewWebhook(false)
    setNewWhUrl(''); setNewWhEvents(['visit.created'])
    load()
  }

  const toggleWebhook = async (id: string, active: boolean) => {
    await supabase.from('webhook_endpoints').update({ active: !active }).eq('id', id)
    load()
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('حذف هذا الـ Webhook؟')) return
    await supabase.from('webhook_endpoints').delete().eq('id', id)
    load()
  }

  const apiBaseUrl = `${SUPABASE_URL}/functions/v1/madar-api`

  const card = { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '18px 20px' }

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>API & التكاملات</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
            إدارة مفاتيح API والـ Webhooks لربط المنصات الخارجية بمادار OS
          </p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', color: '#475569', fontSize: 13, fontFamily: 'Cairo, sans-serif' }}>
          <RefreshCw size={13} /> تحديث
        </button>
      </div>

      {/* API Base URL info */}
      <div style={{ ...card, background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.2)' }}>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#0099CC', fontFamily: 'Cairo, sans-serif' }}>Base URL للـ API</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, direction: 'ltr' }}>
          <code style={{ flex: 1, fontSize: 12, color: '#0F172A', fontFamily: 'monospace', background: '#F1F5F9', padding: '8px 12px', borderRadius: 8, overflowX: 'auto', display: 'block' }}>
            {apiBaseUrl}
          </code>
          <button onClick={() => { navigator.clipboard.writeText(apiBaseUrl) }}
            style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer', color: '#475569', fontSize: 12 }}>
            <Copy size={13} />
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
          أضف <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>Authorization: Bearer mdrc_xxx</code> في كل طلب
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0' }}>
        {[
          { key: 'keys', label: 'مفاتيح API', icon: Key },
          { key: 'webhooks', label: 'Webhooks', icon: Globe },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700, color: activeTab === key ? '#22D3EE' : '#475569', borderBottom: activeTab === key ? '2px solid #22D3EE' : '2px solid transparent', marginBottom: -1 }}>
            <Icon size={14} />{label}
            <span style={{ background: activeTab === key ? 'rgba(34,211,238,0.12)' : '#F1F5F9', color: activeTab === key ? '#0099CC' : '#94A3B8', fontSize: 11, fontFamily: 'Sora, sans-serif', fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>
              {key === 'keys' ? apiKeys.length : webhooks.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 60, color: '#94A3B8' }}>
          <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontFamily: 'Tajawal, sans-serif' }}>جاري التحميل...</span>
        </div>
      ) : activeTab === 'keys' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowNewKey(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #22D3EE, #06B6D4)', color: '#fff', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700 }}>
              <Plus size={14} /> توليد مفتاح جديد
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 48, color: '#94A3B8' }}>
              <Key size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontFamily: 'Tajawal, sans-serif', margin: 0 }}>لا توجد مفاتيح API بعد</p>
            </div>
          ) : apiKeys.map(k => (
            <div key={k.id} style={{ ...card, opacity: k.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: k.active ? 'rgba(34,211,238,0.1)' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Key size={16} color={k.active ? '#22D3EE' : '#94A3B8'} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{k.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
                      {(k.company as any)?.name || k.company_id}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'monospace', background: k.active ? '#DCFCE7' : '#FEE2E2', color: k.active ? '#16A34A' : '#DC2626' }}>
                    {k.active ? 'نشط' : 'معطّل'}
                  </span>
                  {k.active && (
                    <button onClick={() => revokeKey(k.id)} disabled={revoking === k.id}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #FCA5A5', background: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}>
                      {revoking === k.id ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'تعطيل'}
                    </button>
                  )}
                  <button onClick={() => deleteKey(k.id)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <code style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569', background: '#F8FAFC', padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                  {k.key_prefix}
                </code>
                {k.permissions.map(p => (
                  <span key={p} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', color: '#6366F1', fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>{p}</span>
                ))}
                <span style={{ marginRight: 'auto', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>
                  <Activity size={10} style={{ marginLeft: 3 }} />آخر استخدام: {timeAgo(k.last_used_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowNewWebhook(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366F1, #818CF8)', color: '#fff', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700 }}>
              <Plus size={14} /> إضافة Webhook
            </button>
          </div>

          {webhooks.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 48, color: '#94A3B8' }}>
              <Globe size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontFamily: 'Tajawal, sans-serif', margin: 0 }}>لا توجد Webhooks مضافة</p>
            </div>
          ) : webhooks.map(wh => (
            <div key={wh.id} style={{ ...card, opacity: wh.active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontFamily: 'monospace', color: '#0F172A', direction: 'ltr', wordBreak: 'break-all' }}>{wh.url}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
                    {(wh.company as any)?.name || wh.company_id} — آخر إرسال: {timeAgo(wh.last_triggered_at)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toggleWebhook(wh.id, wh.active)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${wh.active ? '#FCA5A5' : '#BBF7D0'}`, background: wh.active ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', color: wh.active ? '#EF4444' : '#16A34A', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}>
                    {wh.active ? 'إيقاف' : 'تفعيل'}
                  </button>
                  <button onClick={() => deleteWebhook(wh.id)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {wh.events.map(e => (
                  <span key={e} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', color: '#6366F1', fontFamily: 'Sora, sans-serif' }}>{e}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: New API Key ── */}
      {showNewKey && (
        <div onClick={e => e.target === e.currentTarget && setShowNewKey(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#FFF', borderRadius: 20, width: '100%', maxWidth: 460, overflow: 'hidden' }} dir="rtl">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: 'Cairo, sans-serif', color: '#0F172A' }}>توليد مفتاح API جديد</h3>
              <button onClick={() => setShowNewKey(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                placeholder="اسم المفتاح"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontFamily: 'Cairo, sans-serif', fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={createKey} disabled={generatingKey}
                  style={{ flex: 1, padding: 11, borderRadius: 12, border: 'none', cursor: generatingKey ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #22D3EE, #06B6D4)', color: '#FFF', fontFamily: 'Cairo, sans-serif', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {generatingKey ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Key size={15} />}
                  {generatingKey ? 'جاري التوليد...' : 'توليد'}
                </button>
                <button onClick={() => setShowNewKey(false)} style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid #E2E8F0', background: 'transparent', color: '#64748B', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Revealed Key ── */}
      {revealedKey && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#FFF', borderRadius: 20, width: '100%', maxWidth: 480 }} dir="rtl">
            <div style={{ padding: '22px 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={24} color="#16A34A" />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, fontFamily: 'Cairo, sans-serif', color: '#0F172A' }}>تم توليد المفتاح ✓</h3>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: '#EF4444', fontFamily: 'Tajawal, sans-serif', fontWeight: 700 }}>
                ⚠️ انسخ المفتاح الآن — لن يظهر مرة ثانية!
              </p>
              <div style={{ background: '#0F172A', borderRadius: 12, padding: '14px 16px', direction: 'ltr', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <code style={{ flex: 1, fontSize: 13, color: '#22D3EE', fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'left' }}>
                  {revealedKey}
                </code>
                <button onClick={() => { navigator.clipboard.writeText(revealedKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2500) }}
                  style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9, border: 'none', background: copiedKey ? '#16A34A' : '#1E293B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                  {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <button onClick={() => setRevealedKey(null)}
                style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#0F172A', color: '#FFF', fontFamily: 'Cairo, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                فهمت، أغلق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: New Webhook ── */}
      {showNewWebhook && (
        <div onClick={e => e.target === e.currentTarget && setShowNewWebhook(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#FFF', borderRadius: 20, width: '100%', maxWidth: 460 }} dir="rtl">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: 'Cairo, sans-serif', color: '#0F172A' }}>إضافة Webhook</h3>
              <button onClick={() => setShowNewWebhook(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>Webhook URL *</label>
                <input value={newWhUrl} onChange={e => setNewWhUrl(e.target.value)} dir="ltr"
                  placeholder="https://your-platform.com/webhooks/madar"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontFamily: 'monospace', fontSize: 12, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 8 }}>الأحداث</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EVENT_OPTIONS.map(e => (
                    <button key={e.value} onClick={() => setNewWhEvents(prev => prev.includes(e.value) ? prev.filter(x => x !== e.value) : [...prev, e.value])}
                      style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer', border: `1px solid ${newWhEvents.includes(e.value) ? 'rgba(99,102,241,0.4)' : '#E2E8F0'}`, background: newWhEvents.includes(e.value) ? 'rgba(99,102,241,0.08)' : '#F8FAFC', color: newWhEvents.includes(e.value) ? '#6366F1' : '#64748B' }}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={createWebhook} disabled={savingWebhook || !newWhUrl.trim()}
                  style={{ flex: 1, padding: 11, borderRadius: 12, border: 'none', cursor: savingWebhook || !newWhUrl.trim() ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #6366F1, #818CF8)', color: '#FFF', fontFamily: 'Cairo, sans-serif', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !newWhUrl.trim() ? 0.5 : 1 }}>
                  {savingWebhook ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Globe size={15} />}
                  {savingWebhook ? 'جاري الحفظ...' : 'إضافة Webhook'}
                </button>
                <button onClick={() => setShowNewWebhook(false)} style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid #E2E8F0', background: 'transparent', color: '#64748B', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
