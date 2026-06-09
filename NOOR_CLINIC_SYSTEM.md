# 🦷 نظام عيادات نور للأسنان — التوثيق الكامل

> منصة حجز ذكية كاملة: مساعد صوتي/واتساب (نورة) → n8n → Supabase + Google Calendar → داشبورد إدارة.
> آخر تحديث: 2026-06-02

---

## 1) نظرة عامة على المعمارية

```
                          ┌──────────────────────────┐
   المريض (واتساب/مكالمة) │   ElevenLabs Agent (نورة) │
        │                 │   7 tools → n8n webhook   │
        ▼                 └────────────┬─────────────┘
                                       │ POST /clinic-tools
                                       ▼
                          ┌──────────────────────────┐
                          │  n8n: ElevenLabs Tool     │
                          │  Router (يوجّه 6 actions)  │
                          └───────┬───────────┬───────┘
                                  │           │
                  مصدر الحقيقة ▼           ▼ مرآة للعرض
                    ┌──────────────┐   ┌──────────────────┐
                    │   Supabase    │   │  Google Calendar  │
                    │ patients +    │   │  (تقويم الدكتور)  │
                    │ appointments  │   └──────────────────┘
                    └──────┬───────┘
                           │ Realtime (تحديث حي)
                           ▼
                    ┌──────────────────────────┐
                    │  داشبورد الإدارة (Netlify) │
                    │  noor-clinic-dashboard     │
                    └──────────────────────────┘
```

**المبدأ الذهبي:** Supabase = **مصدر الحقيقة الوحيد**. Google Calendar = **مرآة مرنة** (الحجز ينجح حتى لو التقويم فشل).

---

## 2) المعرّفات والمفاتيح

| العنصر | القيمة |
|---|---|
| **ElevenLabs Agent** | `AI Receptionist` — `agent_6901kgxmt4pbfmy84gp7xx3tbsvk` |
| **اللغة/الصوت** | عربي — لهجة جدة (Jeddawi) |
| **n8n Webhook** | `https://keepcalm.app.n8n.cloud/webhook/clinic-tools` |
| **n8n Workflow** | `ElevenLabs Tool Router` — ID `l2aLJ4ost3gBma4V` |
| **Supabase Project** | `aacnqiuwrpzgxhzdavaq` (jasem-workflow) |
| **Supabase URL** | `https://aacnqiuwrpzgxhzdavaq.supabase.co` |
| **Google Calendar** | `gack20122012@gmail.com` |
| **رقم العيادة (المكالمات)** | +966 56 876 6030 |

### 🌐 الداشبورد
| العنصر | القيمة |
|---|---|
| **الرابط** | https://noor-clinic-dashboard.netlify.app |
| **Netlify Site ID** | `fa543fd1-6b8b-4099-8489-3198978e29bf` |
| **بريد الدخول** | `admin@noor-dental.com` |
| **كلمة السر** | `Noor@2026` ⚠️ غيّرها من Supabase |

---

## 3) ElevenLabs Agent (نورة)

### الإعداد
- **First Message:** `هلا وغلا! أنا نورة من عيادات نور للأسنان. وش أقدر أساعدك فيه اليوم؟`
- **System Prompt:** إنجليزي (أدق للـ LLM) — يحدد الهوية، الأطباء، الخدمات، قواعد الحجز.
- **Override prompt = ON** على كل نودات الـ Workflow (مهم: بدونه يستخدم الـ system prompt بدل نص النود).
- **كل الـ edges** فيها Transition type = **LLM Condition** (forward + backward).

### الـ 7 Tools (كلها → n8n)
| Tool | action المرسل | الحقول |
|---|---|---|
| `client_lookup` | `client_lookup` | phone (تلقائي من `{{customer_phone}}`) |
| `new_client` | `new_client` | patient_name, phone, national_id |
| `check_availability` | `check_availability` | doctor, date (YYYY-MM-DD) |
| `book_event` | `book_event` | patient_name, phone, national_id, doctor, service, date, datetime (HH:MM) |
| `lookup_appointment` | `lookup_appointment` | phone |
| `delete_appointment` | `cancel_appointment` | appointment_id |
| `update_appointment` | `cancel_appointment` | appointment_id (ثم book_event بالوقت الجديد) |

> **مهم:** الجوال يُملأ تلقائياً من `{{customer_phone}}` — نورة ما تسأل عنه.
> **صيغة الوقت:** datetime بصيغة 24 ساعة (`15:00` = 3 مساءً). الـ n8n يطبّعها لو جت بأي شكل.

---

## 4) n8n Workflow — التفصيل

### تدفق `book_event` (الأهم)
```
1. Parse Booking Data  → يطبّع التاريخ والوقت (يدعم "11"، "11:00"، datetime كامل)
2. Check Existing Slot → فحص مسبق للموعد
3. Slot Already Taken? → IF
     ├─ نعم → Respond: Slot Taken (رسالة "اختر وقت آخر")
     └─ لا  → Run: Book Event (Supabase insert)
                → Create Google Calendar Event (onError=continue)
                → Store Calendar Event ID (يحفظ event_id في Supabase)
                → Respond: Book Event ✅
```

### تدفق `cancel_appointment`
```
Get Appt for Cancel → يقرأ google_calendar_event_id
   → Delete Calendar Event (onError=continue)
   → Run: Delete Appointment (status=cancelled في Supabase)
   → Respond ✅
```

### الباقي
- `client_lookup` → بحث في `clinic_patients` بالجوال.
- `new_client` → إضافة مريض في `clinic_patients`.
- `check_availability` → يجيب المحجوز ثم يحسب المتاح؛ **يبدأ من أقرب وقت من الآن** (توقيت الرياض)، يخفي ما فات، أقصى 6 مواعيد.
- `lookup_appointment` → آخر موعد مؤكد للمريض بالجوال.

---

## 5) قاعدة البيانات (Supabase)

### جدول `clinic_patients`
| العمود | النوع |
|---|---|
| id | uuid (PK) |
| name | text |
| phone | text |
| national_id | text |
| total_appointments | int |
| last_appointment_date | date |
| created_at / updated_at | timestamptz |

### جدول `clinic_appointments`
| العمود | النوع |
|---|---|
| id | uuid (PK) |
| patient_name | text |
| patient_phone | text |
| national_id | text |
| doctor | text |
| service_type | text |
| appointment_date | date |
| appointment_time | time |
| status | text (confirmed/cancelled/completed/no_show) |
| google_calendar_event_id | text |
| notes | text |
| created_at / updated_at | timestamptz |

### الحماية والأداء (تحسينات 10/10)
- **RLS مفعّل** على `clinic_patients` و `clinic_appointments`.
  - `authenticated` (الداشبورد) → صلاحية كاملة.
  - n8n يستخدم service_role → يتجاوز RLS.
  - `anon` (المتصفح) → ممنوع (سدّ تسريب بيانات المرضى).
- **منع Double Booking:** فهرس فريد جزئي `uniq_active_doctor_slot` على (doctor, appointment_date, appointment_time) WHERE status IN ('confirmed','completed').
- فهارس أداء: `idx_appt_doctor_date`, `idx_appt_phone`.

---

## 6) الداشبورد (HTML + Supabase JS)

- **ملف واحد:** `clinic-dashboard.html` (منشور كـ index.html على Netlify).
- **التصميم:** أزرق طبي عصري، RTL، خط Cairo، Responsive.
- **محمي بتسجيل دخول** Supabase Auth (يشتغل مع RLS).

### الأقسام
| القسم | المحتوى |
|---|---|
| 📊 الرئيسية | 4 بطاقات KPI + جدول مواعيد اليوم + القادمة (أزرار إكمال/إلغاء) |
| 📅 التقويم | عرض شهري، المواعيد موزعة، تنقل بين الشهور |
| 👥 المرضى | قائمة + بحث بالاسم/الجوال + عدد مواعيد كل مريض |
| 📈 التقارير | 4 رسوم: حجوزات 14 يوم، الخدمات، الأطباء، الحالات |

### مميزات
- 🔄 **تحديث حي** (Supabase Realtime) — حجوزات نورة تظهر فوراً.
- 🗑️ **زر الإلغاء يمر عبر n8n** → يُحذف من Google Calendar أيضاً (متزامن).
- ✅ **زر الإكمال** → تحديث مباشر في Supabase.

---

## 7) الأطباء والخدمات

**روتيني (حجز مباشر):** تنظيف، فحص، حشو، خلع، أطفال
**معقّد (تأهيل أول):** زراعة، تقويم، تلبيس

| القسم | الأطباء |
|---|---|
| تنظيف وفحص | Dr. Khalid Al-Otaibi, Dr. Reem Al-Zahrani |
| تقويم | Dr. Sultan Al-Qahtani, Dr. Nada Al-Shehri |
| تجميل وتلبيس | Dr. Faisal Al-Dosari, Dr. Sara Al-Harbi |
| خلع وجراحة | Dr. Omar Al-Ghamdi, Dr. Hana Al-Maliki |
| أسنان أطفال | Dr. Turki Al-Aqeel, Dr. Lama Al-Enezi |
| زراعة | Dr. Abdullah Al-Rashidi, Dr. Maya Al-Bishi |

> ⚠️ إيميلات الأطباء placeholders — تُستبدل بالحقيقية لو احتجت ربط Calendly منفصل لكل دكتور (حالياً كل المواعيد على تقويم واحد).

---

## 8) المسار الكامل للحجز (مثال)

```
1. مريض يكتب "أبغا أحجز موعد" بواتساب
2. نورة → client_lookup (تعرفه بالرقم تلقائياً)
3. إذا جديد → new_client (تسجيله)
4. تسأل عن الخدمة → Service Classifier
5. تسأل عن الدكتور والتاريخ → check_availability (تعرض أقرب الأوقات)
6. المريض يختار → تأكيد → book_event
7. ✅ Supabase + Google Calendar + رسالة تأكيد
8. الموعد يظهر فوراً في الداشبورد
```

---

## 9) ما تم إنجازه (ملخص)

- ✅ نورة تستقبل واتساب/مكالمات بلهجة جدة
- ✅ كل الـ tools محوّلة من Calendly إلى n8n + Supabase
- ✅ Supabase = مصدر الحقيقة، Calendar = مرآة مرنة
- ✅ event_id يُحفظ → الإلغاء/التعديل يتزامن مع التقويم
- ✅ منع Double Booking (فحص + فهرس فريد)
- ✅ RLS مفعّل (بيانات المرضى محمية)
- ✅ المواعيد تبدأ من أقرب وقت من الآن
- ✅ داشبورد إدارة كامل منشور على Netlify
- ✅ اختبار end-to-end ناجح (حجز/رفض مكرر/إلغاء/إعادة حجز)

---

## 10) المتبقي / تحسينات مستقبلية

1. **تغيير كلمة سر الداشبورد** من Supabase (الحالية معروفة).
2. **ربط الهاتف الأرضي** عبر SIP Trunk (مزود سعودي) للمكالمات.
3. **تذكيرات تلقائية** قبل الموعد (WhatsApp) — workflows جاهزة بالاسم: WBOS Reminder/Review/No-Show.
4. **إيميلات الأطباء الحقيقية** لو احتجت تقاويم منفصلة.
5. **دومين مخصص** للداشبورد بدل netlify.app (اختياري).
6. **multi-tenant** — نفس البنية لعيادات أخرى (Madar كوكالة).

---

_بُني بالكامل عبر Claude Code — ElevenLabs + n8n + Supabase + Google Calendar + Netlify._
