# 🏢 MADAR OS — التوثيق الشامل للمشروع

> **مدار** وكالة أتمتة بالذكاء الاصطناعي. منصة واحدة (Madar OS) تخدم عدة قطاعات، كل قطاع منتج مستقل لكن يشترك في نفس البنية: Supabase + Dashboard + n8n + AI.

_آخر تحديث: 2026-06-01_

---

## 1) البنية التحتية المشتركة

| الطبقة | التقنية | التفاصيل |
|---|---|---|
| **Frontend** | React + Vite + Tailwind | Netlify (madar.software) |
| **Backend / DB** | Supabase | project `aacnqiuwrpzgxhzdavaq` (jasem-workflow) |
| **Automation** | n8n | `keepcalm.app.n8n.cloud` |
| **WhatsApp** | Meta Business API | Phone ID متعدد حسب المنتج |
| **Voice AI** | ElevenLabs Agents | للعيادات (Nora) |
| **Booking** | Calendly | للعيادات |
| **AI Models** | Claude Haiku / GPT-4o-mini | حسب المهمة |

---

## 2) المنتجات الثلاثة

### 🚗 المنتج 1 — مغاسل السيارات (Car Wash OS) ✅ الأنضج
نظام تشغيل كامل لمغسلة (walk-in فقط، بدون مواعيد).

**المكوّنات:**
- Dashboard: طابور السيارات، العمال، المصاريف، الإغلاق اليومي، الولاء، الحملات
- 11 workflow شغّالة في n8n (واتساب آلي بالكامل)
- OTP عبر واتساب لتسجيل دخول العملاء

**جداول Supabase (cw_*):**
`cw_customers`, `cw_visits`, `cw_workers`, `cw_queue`, `cw_expenses`, `cw_services`, `cw_daily_closings`, `cw_campaigns`, `cw_audit_logs`, `cw_otps`, `cw_phone_otps`, `cw_membership_plans`, `cw_customer_memberships`, `cw_wallet_transactions`

**n8n Workflows (CW):**
| Workflow | الجدول | الوظيفة |
|---|---|---|
| CW — Car Ready | webhook | واتساب "سيارتك جاهزة" |
| CW — Delivery Receipt | webhook | فاتورة واتساب بعد التسليم |
| CW — Loyalty Milestone | webhook | تهنئة الغسلة المجانية |
| CW — Daily Closing Summary | webhook | ملخص يومي للمالك |
| CW — Review Request | كل 30د | طلب تقييم Google |
| CW — Daily Reactivation | يومي 10ص | تنشيط العملاء الخاملين 30+ يوم |
| CW — Post Followup | كل ساعة | متابعة بعد الزيارة |
| CW — Weekly Promo (AI) | خميس 9ص | عرض أسبوعي مولّد بالـ AI |
| CW — First Visit Welcome | كل 30د | ترحيب أول زيارة |
| CW — Manual Campaigns | كل دقيقتين | حملات يدوية من الـ Dashboard |
| CW — Walk-in Registration | webhook | ترحيب فوري عند التسجيل |
| CW — OTP WhatsApp | webhook | رمز تحقق |

> **ملاحظة:** الإشعارات هاجرت من n8n إلى Supabase DB triggers (commit `7ca2b3c`).

---

### 🦷 المنتج 2 — العيادات الطبية (مربوط ElevenLabs) ✅ تم بناؤه
مساعد استقبال صوتي/واتساب (Nora) يحجز عبر Calendly.

**التفاصيل الكاملة:** → [ELEVENLABS_DENTAL_AGENT.md](ELEVENLABS_DENTAL_AGENT.md)

**ملخص سريع:**
- ElevenLabs Agent `AI Receptionist` — workflow بـ 24 node
- التوجيه: جديد/قديم (lookup صامت) → حجز/تعديل/إلغاء/تحويل
- 7 tools: 5 على Calendly + 2 على n8n
- Knowledge Base للأسئلة الشائعة
- نموذج الهوية: اسم + رقم هوية + إيميل الدكتور (بدون إيميل المريض)

**جداول Supabase (clinic):**
`clinic_patients` (12), `clinic_appointments`, `message_logs`, `doctors` (4), `working_hours`, `offers`, `customer_service`, `clinic_info` (62 — مصدر الـ FAQ), `conversation_state`

**جداول WBOS (تصميم سابق — Google Calendar):**
`branches`, `wbos_services`, `wbos_resources`, `wbos_schedules`, `wbos_blocked_days`, `branch_settings`, `appointments`

> ⚠️ **تعارض بيانات:** الـ prompt فيه 12 دكتور افتراضي + ساعات افتراضية، بينما Supabase فيه عيادة متعددة التخصصات حقيقية (دوام أحد-خميس ٨ص-١٠م، الجمعة مغلق). يحتاج توحيد.

---

### 🏠 المنتج 3 — العقارات 🔲 لم يُبنَ
موقع عرض عقارات + واتساب مباشر (wa.me).

**المخطط:**
- React + Tailwind + Supabase + Netlify
- جدول `properties` (لم يُنشأ بعد)
- صفحات: Home / Listings / Property Detail / Admin
- **لا** بوت واتساب ولا CRM عقاري (في الوقت الحالي)

---

## 3) MADAR Dashboard (مشترك)

### Admin Portal (`/admin`)
Command Deck · Accounts · Appointments · Conversations · Live Pipeline (CRM) · n8n Reactor · System Logs

### Client Portal (`/client`)
نظرة عامة · إعداد النظام · المواعيد · المحادثات الحية · أتمتتي · CRM · التقارير · الإعدادات

**جداول مشتركة:**
`companies` (3), `users`, `company_users`, `crm_leads`, `crm_packages`, `automations`, `logs`, `staff`, `services`, `loyalty_programs`, `ai_assistant_conversations`, `ai_assistant_messages`, `ai_assistant_usage`

---

## 4) باقات الأسعار

| الباقة | السعر | الرسائل | المميزات |
|---|---|---|---|
| ابتدائي | 299 ر.س/شهر | 1,000 | واتساب آلي، CRM أساسي |
| نمو | 799 ر.س/شهر | 4,000 | حجز ذكي، Claude AI، تذكيرات |
| مؤسسي | 1,999 ر.س/شهر | 10,000 | متعدد وكلاء، API مخصص، 24/7 |

---

## 5) ⚠️ الحالة الأمنية (مهم)

**19 جدول في Supabase بدون RLS** — مكشوفة لأي شخص معه الـ anon key:
`clinic_patients`, `clinic_appointments`, `message_logs`, `doctors`, `working_hours`, `offers`, `customer_service`, `clinic_info`, `branches`, `wbos_*`, `branch_settings`, `conversation_state`, `cw_otps`, `_madar_config`

> **إجراء مطلوب:** تفعيل RLS + سياسات مناسبة لكل جدول قبل الإنتاج. (لا تُفعّل RLS بدون policies — يحجب كل الوصول.)

---

## 6) الحالة العامة وما تبقّى

### ✅ جاهز
- Car Wash OS — كامل وشغّال
- Dental Agent (ElevenLabs) — مبني ومختبر

### 🔲 يحتاج إكمال
**العيادات:**
- [ ] إيميلات الأطباء الحقيقية (بدل placeholders)
- [ ] ربط SIP Trunk للخط الأرضي
- [ ] خانة ID NUMBER في Calendly (ربط يدوي)
- [ ] WhatsApp + SMS fallback للتأكيد
- [ ] توحيد بيانات الأطباء/الساعات (prompt ↔ Supabase)
- [ ] Publish + اختبار end-to-end

**العقارات:**
- [ ] الموقع كامل من الصفر

**عام:**
- [ ] تفعيل RLS على الجداول المكشوفة

---

## 7) ملفات التوثيق

| الملف | المحتوى |
|---|---|
| [MADAR_MASTER.md](MADAR_MASTER.md) | هذا الملف — نظرة شاملة |
| [ELEVENLABS_DENTAL_AGENT.md](ELEVENLABS_DENTAL_AGENT.md) | توثيق agent العيادات الكامل |
| [N8N_WORKFLOWS.md](N8N_WORKFLOWS.md) | workflows المغاسل بالتفصيل |
| [WBOS_AI_Design.md](WBOS_AI_Design.md) | تصميم WBOS الأصلي (3 منتجات) |
| [README.md](README.md) | نقطة الدخول |
