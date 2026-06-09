# WBOS — WhatsApp Booking Operating System
## وثيقة التصميم الكاملة | MADAR AI

---

## نظرة عامة

MADAR تقدم 3 منتجات لـ 3 قطاعات مختلفة. كل منتج له stack تقني مختلف لكن كلهم يشتركون في:
- **Supabase** (قاعدة البيانات المركزية)
- **MADAR Dashboard** (لوحة تحكم الأدمن والعميل)
- **n8n** (محرك الأتمتة)

---

## المنتج 1 — عيادات طبية

### خيارين للعميل:

#### A) باقة واتساب
```
مريض يرسل واتساب
      ↓
n8n Bot (عربي)
      ↓
حجز على Calendly
      ↓
تأكيد واتساب فوري
      ↓
تذكير قبل 24 ساعة
      ↓
متابعة بعد الموعد
      ↓
Supabase (appointments + CRM)
```

**الأدوات:**
- WhatsApp Business API (Meta)
- Calendly (واجهة الحجز — جاهزة، لا نبنيها)
- n8n (Calendly Webhook → واتساب)
- Supabase MADAR

**لماذا Calendly؟**
- واجهة حجز احترافية جاهزة
- يدير التقويم والتعارضات تلقائياً
- يدعم Asia/Riyadh timezone
- $10/شهر بدل بناء نظام من الصفر

#### B) باقة Voice Agent
```
مريض يتصل برقم العيادة
      ↓
ElevenLabs Voice Agent (عربي)
      ↓
يفهم الطلب ويحجز على Calendly
      ↓
n8n يستقبل Calendly Webhook
      ↓
تأكيد واتساب + حفظ Supabase
```

**الأدوات:**
- ElevenLabs Voice Agent (workflow جاهز داخله)
- Calendly (نقطة الحجز المشتركة)
- n8n (Calendly Webhook → واتساب + Supabase)
- رقم هاتف مخصص للعيادة (Twilio أو STC)

**ملاحظة:** ElevenLabs يتكفل بكل منطق المحادثة الصوتية — n8n فقط يربط المخرجات

### n8n Workflow للعيادات (Calendly → واتساب):
```
1. Calendly Webhook Trigger
   (invitee.created / cancelled / rescheduled)
2. Normalize Input
   (اسم، هاتف، وقت الموعد، نوع الخدمة)
3. Router (نوع الحدث)
   - created    → رسالة تأكيد
   - cancelled  → رسالة إلغاء
   - rescheduled → رسالة تعديل
4. WhatsApp Send
   "تم تأكيد موعدك ✅ يوم [date] الساعة [time]"
5. Supabase Upsert → appointments
6. Supabase Upsert → crm_leads
7. Logger → message_logs
```

### Reminder Workflow (مستقل):
```
Schedule كل 30 دقيقة
→ Supabase: appointments حيث scheduled_at بعد 24h AND reminder_sent = false
→ WhatsApp: "تذكير: موعدك غداً الساعة [time] 🏥"
→ Supabase: reminder_sent = true
```

---

## المنتج 2 — عقارات

### الخدمة: موقع عرض عقارات

**نطاق الخدمة:**
- موقع احترافي يعرض العقارات (بيع / إيجار / تجاري)
- فلاتر بحث (المنطقة، السعر، النوع، المساحة)
- صفحة تفصيلية لكل عقار (صور، خريطة، مواصفات)
- زر "تواصل معنا" أو "احجز جولة" → واتساب مباشرة
- لوحة أدمن بسيطة لإضافة/تعديل العقارات

**Stack:**
- React + Tailwind (Frontend)
- Supabase (قاعدة بيانات العقارات)
- Netlify (hosting)
- واتساب رابط مباشر (wa.me) لطلب الجولات

**جداول Supabase:**
```sql
properties (id, title, type, category, price, area_sqm,
            bedrooms, bathrooms, location, city, district,
            description, images[], is_featured, is_available,
            company_id, created_at)
```

**لا يشمل (في الوقت الحالي):**
- واتساب بوت للعقارات
- نظام حجز جولات تلقائي
- CRM عقاري

---

## المنتج 3 — مغاسل السيارات (CW)

### الخدمة: نظام حجز واتساب كامل بـ AI

**Stack:**
- WhatsApp Business API → n8n AI Booking Bot → Supabase
- Calendly API (للتحقق من المواعيد المتاحة فقط)
- Claude Haiku 4.5 (AI Agent)
- MADAR Dashboard (ClientPortal) للمتابعة

### تدفق الحجز (AI Agent):
```
عميل يرسل واتساب
      ↓
n8n يستقبل الرسالة
      ↓
Claude AI Agent يبدأ المحادثة:
   ├── يجمع: الاسم، الخدمة، التاريخ المفضل
   ├── يتحقق: من Calendly API للمواعيد المتاحة
   └── يحجز: مباشرة في Supabase
      ↓
تأكيد واتساب فوري
      ↓
تذكير قبل 24 ساعة
      ↓
متابعة بعد الخدمة "كيف كانت تجربتك؟"
```

### n8n Workflows (كلها تبدأ بـ CW):
| Workflow | ID | الحالة | الوصف |
|----------|-----|--------|-------|
| CW — WhatsApp Booking Bot (Calendly) | `rB90MacXSRgcU6RA` | ✅ تم البناء | البوت الرئيسي للحجز بـ Claude AI |
| CW — Appointment Reminder | — | 🔲 لم يُبنى بعد | تذكير قبل 24h |
| CW — Post-Service Follow-up | — | 🔲 لم يُبنى بعد | متابعة بعد الخدمة |
| CW — Customer Entry & Welcome | — | 🟡 يحتاج Google Sheets | ترحيب بالعملاء الجدد |
| CW — Daily Customer Reactivation | — | 🟡 قيد الإعداد | إعادة تفعيل العملاء |
| CW — Weekly AI Promo | — | 🟡 قيد الإعداد | عروض أسبوعية بـ AI |

### CW — WhatsApp Booking Bot — التفاصيل التقنية:

**Nodes (10 nodes):**
```
1. Receive WhatsApp Message (WhatsApp Trigger)
2. Normalize Input (Set) — phone, message, phone_number_id
3. Claude Booking Agent (AI Agent v3.1)
   ├── Model: Claude Haiku 4.5 (@n8n/n8n-nodes-langchain.lmChatAnthropic)
   ├── Memory: Session Memory (sessionKey = phone number)
   ├── Tool 1: Check Calendly Available Slots (HTTP Request Tool)
   │   GET https://api.calendly.com/event_type_available_times
   │   params: event_type, start_time (fromAI), end_time (fromAI)
   └── Tool 2: Save Booking to Supabase (Supabase Tool)
       INSERT → appointments (customer_name, scheduled_at, service_name, duration_minutes, customer_phone, status, source)
4. Send WhatsApp Reply (WhatsApp)
5. Log to message_logs (Supabase)
```

**System Prompt (Claude AI):**
- يجمع: اسم العميل، الخدمة، التاريخ والوقت
- يتحقق من Calendly قبل تأكيد أي موعد
- يحفظ في Supabase بعد تأكيد العميل
- يرد بالعربي دائماً

**Env vars مطلوبة:**
| المتغير | القيمة |
|--------|--------|
| `WHATSAPP_PHONE_ID` | 1056968717488521 |
| `CALENDLY_EVENT_TYPE_UUID` | من Calendly → Event Types |
| `CALENDLY_API_KEY` | في credential: Calendly Bearer Token |

**Credentials المطلوبة (يدوي في n8n):**
- `Anthropic API` → لـ Claude Model
- `Calendly Bearer Token` → لـ HTTP Request Tool (يدوي)
- `Supabase MADAR` → للحفظ والـ logging
- `WhatsApp Business API` → للإرسال والاستقبال

### جداول Supabase (CW):
| الجدول | الوصف |
|--------|-------|
| `branches` | فروع المغسلة |
| `wbos_services` | الخدمات وأسعارها ومدتها |
| `wbos_resources` | الموظفون / البوهيات |
| `wbos_schedules` | ساعات العمل لكل يوم |
| `wbos_blocked_days` | الإجازات والأيام المغلقة |
| `branch_settings` | إعدادات البوت والرسائل |
| `conversation_state` | حالة كل محادثة (14 حالة) |
| `appointments` | كل المواعيد |
| `message_logs` | سجل كل الرسائل |

### الخدمات وأوقاتها:
| الخدمة | المدة |
|--------|-------|
| غسيل عادي | 30 دقيقة |
| غسيل بريميوم | 60 دقيقة |
| ديتيلينج | 120 دقيقة |

---

## MADAR Dashboard — مشترك للجميع

### Admin Portal (`/admin`):
| الصفحة | الوصف |
|--------|-------|
| Command Deck | نظرة عامة |
| Accounts | إدارة العملاء (إضافة، باقات، تعليق) |
| Appointments | كل المواعيد من كل العملاء |
| Conversations | كل محادثات CW |
| Live Pipeline | CRM leads |
| n8n Reactor | مراقبة الـ workflows |
| System Logs | سجلات النظام |

### Client Portal (`/client`):
| الصفحة | الوصف |
|--------|-------|
| نظرة عامة | إحصائيات + بطاقة الباقة |
| إعداد النظام | Branch / Services / Staff / Schedules |
| المواعيد | حجوزات العميل + إضافة يدوية |
| المحادثات الحية | CW conversation monitor |
| أتمتتي | n8n workflows |
| CRM | العملاء المحتملون |
| التقارير | تقارير شهرية |
| الإعدادات | إعدادات الحساب |

---

## باقات الأسعار

| الباقة | السعر | الرسائل | المميزات الرئيسية |
|--------|-------|---------|-------------------|
| ابتدائي | 299 ر.س/شهر | 1,000 | واتساب أوتوماتيك، CRM أساسي |
| نمو | 799 ر.س/شهر | 4,000 | حجز ذكي، Claude AI، تذكيرات |
| مؤسسي | 1,999 ر.س/شهر | 10,000 | متعدد وكلاء، API مخصص، 24/7 |

---

## Infrastructure

```
Frontend:  React + Vite + Tailwind → Netlify (madar.software)
Backend:   Supabase (aacnqiuwrpzgxhzdavaq) — MADAR project فقط
Automation: n8n (keepcalm.app.n8n.cloud)
WhatsApp:  Meta Business API (Phone ID: 1056968717488521)
Voice:     ElevenLabs (للعيادات — باقة منفصلة)
Booking UI: Calendly (للعيادات فقط — الـ UI)
Calendly API: CW فقط — للتحقق من المواعيد (لا للحجز)
AI Model:  Claude Haiku 4.5 (CW Booking Bot)
```

---

## ما يبقى للبناء

### عيادات:
- [ ] n8n workflow: Calendly Webhook → واتساب تأكيد
- [ ] n8n workflow: Calendly Reminder (24h قبل الموعد)
- [ ] ربط ElevenLabs بـ Calendly Webhook في n8n

### عقارات:
- [ ] تصميم موقع عرض العقارات
- [ ] جدول `properties` في Supabase
- [ ] صفحات: Home، Listings، Property Detail
- [ ] Admin panel لإضافة العقارات

### CW — مغاسل (متبقي):
- [ ] إضافة Anthropic API credential في n8n → تفعيل Booking Bot
- [ ] إضافة Calendly Bearer Token credential في n8n
- [ ] إضافة env vars: WHATSAPP_PHONE_ID، CALENDLY_EVENT_TYPE_UUID
- [ ] تسجيل WhatsApp Webhook في Meta (رابط n8n)
- [ ] بناء CW — Appointment Reminder workflow
- [ ] بناء CW — Post-Service Follow-up workflow
- [ ] اختبار end-to-end
