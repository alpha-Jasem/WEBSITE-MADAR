# 🦷 AI Receptionist — عيادات نور للأسنان (ElevenLabs)

> توثيق كامل لما تم بناؤه — مساعد استقبال صوتي/واتساب يستقبل المكالمات، يؤهّل المرضى الجدد، يحجز/يعدّل/يلغي المواعيد عبر Calendly، ويحوّل للموظف عند الحاجة.

---

## 1) المعرّفات والمفاتيح

| العنصر | القيمة |
|---|---|
| **ElevenLabs Agent** | `AI Receptionist` — `agent_6901kgxmt4pbfmy84gp7xx3tbsvk` |
| **الصوت/اللغة** | عربي — لهجة جدة |
| **ElevenLabs API Key** | في `.env` → `ELEVENLABS_API_KEY` |
| **Calendly Event Type** | `30 Minute Meeting` — `8562949d-e9d4-4a08-825f-46e42d1d6343` |
| **Calendly User** | gack20122012@gmail.com — `1f731dfa-7f75-4157-a2a1-9f228e2000aa` |
| **Calendly Org** | `66b5a717-90c5-491d-8fb0-83a22ac6ce8b` |
| **Calendly Location** | `Noor Dental Clinics - Jeddah` (نص إنجليزي ثابت) |
| **n8n Webhook (tools)** | `https://keepcalm.app.n8n.cloud/webhook/clinic-tools` |

---

## 2) المعمارية العامة (Smart Routing v2)

```
START → GREETING → SILENT CLIENT LOOKUP → INTENT ROUTER
   │
   ├── BOOK NEW → SERVICE CLASSIFIER
   │        ├── COMPLEX (زراعة/تقويم/تلبيس) → QUALIFY → BOOKING
   │        └── ROUTINE (تنظيف/فحص/حشو/خلع/أطفال) → BOOKING
   │     BOOKING: check availability → confirm → (new→register) → book → success
   │
   ├── MANAGE EXISTING → lookup appointment
   │        ├── RESCHEDULE → new date → check avail → confirm → cancel old → rebook
   │        └── CANCEL → confirm → delete
   │
   └── TRANSFER (غضب / دفع / طوارئ طبية / خارج النطاق)

FAQ = يُجاب من Knowledge Base في أي لحظة (مو node)
```

**24 node | 41 edge**

**3 تحسينات أساسية على تصميم اليوتيوب:**
1. **Silent Lookup** — يعرف المريض من رقمه تلقائياً، ما يسأل "جديد أو قديم؟"
2. **FAQ عام** — يجاوب من الـ KB في أي لحظة دون كسر المحادثة
3. **Service Classifier** — تأهيل لكل الخدمات المعقدة (مو الزراعة فقط)

---

## 3) النودات (كل نود وش مكتوب فيه — بالإنجليزي)

> **مهم:** التعليمات بالإنجليزي (أدق للـ LLM)، لكن الـ agent **يرد على المريض بالعربي لهجة جدة** (مفروض في الـ system prompt).

### 🟢 start_node
نقطة البداية. → greeting

### greeting (Greeting)
```
Greet the patient warmly in Jeddah dialect Arabic. Introduce yourself as Nora from Noor Dental Clinics. Ask for the patient's name and what they need help with today. Do not ask whether they are a new or existing patient.
```

### 🔧 tool_cl_silent (Silent Client Lookup)
Tool: `client_lookup` — يبحث عن المريض بالرقم بصمت.

### intent_router (Intent Router)
```
Based on the patient's stated need, route them. Do not speak. Categories: booking a new appointment, managing an existing appointment (reschedule or cancel), or a request requiring a human (anger, payment, medical emergency, out of scope). If the patient only asked a general question, answer it from your knowledge base first, then route.
```

### service_classifier (Service Classifier)
```
Determine the dental service category the patient wants. COMPLEX services (implants, orthodontics, veneers) require a qualification step. ROUTINE services (cleaning, checkup, filling, extraction, pediatric) go straight to booking. Do not speak unless you need to clarify which service.
```

### qualify (Qualify Complex Service)
```
Ask qualifying questions in Jeddah dialect for the chosen complex service. Implants: how many teeth missing, any bone loss or gum disease, any chronic conditions like diabetes. Orthodontics: adult or child, previous ortho treatment. Veneers: how many teeth, cosmetic goal. NEVER ask for an email. If the patient is a suitable candidate to proceed, continue to booking. If they need a specialist in-person evaluation first, transfer to a team member.
```

### booking_prep (Get Doctor and Date)
```
Suggest the matching doctors by name for the chosen service. Ask the patient which doctor they prefer and which day suits them. Also collect the patient's full name and national ID (رقم الهوية). NEVER ask for an email. Do NOT suggest specific times - times come only from the check availability tool.
```

### 🔧 tool_ca (Check Availability)
Tool: `check_availability` → Calendly available times.

### slot_confirm (Present Slots and Confirm)
```
Present the available time slots from the tool response. After the patient picks one, verbally confirm ALL details: patient name, national ID, service, doctor, day, and time. Wait for an explicit YES. The silent client lookup earlier told you whether this patient is new or existing - use that to route after confirmation. When booking, use the chosen doctor's email as the invitee email.
```

### 🔧 tool_nc (Register New Client)
Tool: `new_client` — يسجّل المريض الجديد (فرع المريض الجديد فقط).

### 🔧 tool_be (Book Appointment)
Tool: `book_event` → Calendly create invitee.

### book_success (Booking Confirmed)
```
Tell the patient the appointment is booked. Confirm the day and time clearly. Ask if there is anything else you can help with.
```

### 🔧 tool_la (Lookup Appointment)
Tool: `lookup_appointment` → Calendly scheduled events (للمريض القديم).

### existing_intent (Reschedule or Cancel)
```
Tell the patient their current appointment details: day, time, and doctor. Ask whether they want to reschedule or cancel it.
```

### rsch_date (Get New Date)
```
Ask the patient which new day they prefer for the rescheduled appointment.
```

### 🔧 tool_car (Check Availability Reschedule)
Tool: `check_availability` — نفس tool الإتاحة.

### rsch_confirm (Confirm Reschedule)
```
Present the available slots for the new date. After the patient chooses, confirm the new appointment details and wait for an explicit YES.
```

### 🔧 tool_ua (Cancel for Reschedule)
Tool: `update_appointment` → يلغي الموعد القديم.

### 🔧 tool_rebook (Rebook New Slot)
Tool: `book_event` — يحجز الموعد الجديد بعد الإلغاء.

### cancel_confirm (Confirm Cancellation)
```
Ask the patient to confirm they want to cancel. Mention the day, time, and doctor. Wait for an explicit YES.
```

### 🔧 tool_da (Delete Appointment)
Tool: `delete_appointment` → Calendly cancellation.

### action_success (Action Success)
```
Confirm to the patient that the action completed successfully, in Jeddah dialect. Ask if there is anything else you can help with.
```

### transfer (Transfer to Human)
```
Tell the patient you are transferring them to a team member. Be brief and polite. Then end the call.
```

### 🔴 end_node
نهاية المكالمة.

---

## 4) منطق التوجيه (Edges)

- `start → greeting` (unconditional)
- `greeting → tool_cl_silent` (بعد جمع الاسم والحاجة)
- `tool_cl_silent → intent_router` (نجاح) / `transfer` (فشل)
- `intent_router →` book / manage / transfer (LLM)
- `service_classifier →` qualify (معقّد) / booking_prep (روتيني)
- `qualify →` booking_prep (مؤهّل) / transfer (يحتاج استشارة)
- `booking_prep → tool_ca → slot_confirm`
- `slot_confirm →` tool_nc (جديد) / tool_be (قديم) / booking_prep (تاريخ آخر)
- `tool_nc → tool_be → book_success`
- `tool_la → existing_intent →` reschedule / cancel
- reschedule: `rsch_date → tool_car → rsch_confirm → tool_ua → tool_rebook → action_success`
- cancel: `cancel_confirm → tool_da → action_success`
- كل أداة عند الفشل → `transfer`

---

## 5) الأدوات (7 Tools)

| Tool | ID | الوجهة |
|---|---|---|
| `check_availability` | `tool_6301...` | Calendly GET event_type_available_times |
| `book_event` | `tool_8701...` | Calendly POST /invitees |
| `lookup_appointment` | `tool_0301...` | Calendly GET /scheduled_events |
| `delete_appointment` | `tool_9901...` | Calendly POST /cancellation |
| `update_appointment` | `tool_1401...` | Calendly POST /cancellation |
| `client_lookup` | `tool_1501...` | n8n /clinic-tools |
| `new_client` | `tool_7601...` | n8n /clinic-tools |

### نموذج الحجز (book_event)
```
invitee.name  = اسم المريض الكامل
invitee.email = إيميل الدكتور المختار (من خريطة الإيميلات)
invitee.timezone = Asia/Riyadh
location = Noor Dental Clinics - Jeddah
questions_and_answers[0].answer = "National ID: <id> | Phone: {{customer_phone}}"
```
**ملاحظة:** لا نجمع إيميل المريض نهائياً. الجوال تلقائي من `{{customer_phone}}`.

---

## 6) خريطة إيميلات الأطباء (في الـ System Prompt)

| الدكتور | الإيميل (placeholder) |
|---|---|
| Dr. Khalid Al-Otaibi | dr.khalid@noor-dental.com |
| Dr. Reem Al-Zahrani | dr.reem@noor-dental.com |
| Dr. Sultan Al-Qahtani | dr.sultan@noor-dental.com |
| Dr. Nada Al-Shehri | dr.nada@noor-dental.com |
| Dr. Faisal Al-Dosari | dr.faisal@noor-dental.com |
| Dr. Sara Al-Harbi | dr.sara@noor-dental.com |
| Dr. Omar Al-Ghamdi | dr.omar@noor-dental.com |
| Dr. Hana Al-Maliki | dr.hana@noor-dental.com |
| Dr. Turki Al-Aqeel | dr.turki@noor-dental.com |
| Dr. Lama Al-Enezi | dr.lama@noor-dental.com |
| Dr. Abdullah Al-Rashidi | dr.abdullah@noor-dental.com |
| Dr. Maya Al-Bishi | dr.maya@noor-dental.com |

⚠️ **هذه إيميلات افتراضية** — تُستبدل بالإيميلات الحقيقية قبل التشغيل.

---

## 7) الخدمات والأطباء

| القسم | الأطباء |
|---|---|
| تنظيف وفحص | Dr. Khalid Al-Otaibi, Dr. Reem Al-Zahrani |
| تقويم | Dr. Sultan Al-Qahtani, Dr. Nada Al-Shehri |
| تجميل وتلبيس | Dr. Faisal Al-Dosari, Dr. Sara Al-Harbi |
| خلع وجراحة | Dr. Omar Al-Ghamdi, Dr. Hana Al-Maliki |
| أسنان أطفال | Dr. Turki Al-Aqeel, Dr. Lama Al-Enezi |
| زراعة | Dr. Abdullah Al-Rashidi, Dr. Maya Al-Bishi |

**معقّد (تأهيل):** زراعة، تقويم، تلبيس
**روتيني (حجز مباشر):** تنظيف، فحص، حشو، خلع، أطفال

---

## 8) Knowledge Base (FAQ)
مرفوع كـ document باسم `Noor Dental FAQs` (`j9pRAF2kKdb0MfzlEdvw`) — يحوي: ساعات العمل، الأسعار، الأطباء، الموقع، طرق الدفع، التأمين، مدة المواعيد.

---

## 9) ما تم استبعاده عمداً
- ❌ تسجيل المكالمات في Supabase/n8n — **Calendly نفسه هو السجل** (كل حجز = اسم + جوال + هوية)
- ❌ سكربت تأهيل مفصّل — اكتفينا بالمختصر
- ❌ event types منفصلة لكل دكتور — حساب Calendly واحد، إيميل الدكتور كـ invitee يكفي
- ❌ VAPI — تم حذفه نهائياً

---

## 10) ⚠️ يحتاج إكمال قبل التشغيل الفعلي

1. **إيميلات الأطباء الحقيقية** — استبدال الـ placeholders في System Prompt + خريطة الإيميلات.
2. **خانة ID NUMBER** — Calendly API ما يسمح بإضافة سؤال مخصص برمجياً؛ رقم الهوية يُحفظ حالياً في خانة الملاحظات الافتراضية. لو تبيه في خانة "ID NUMBER" المنفصلة → ربط يدوي في إعدادات Calendly.
3. **ربط الهاتف الأرضي** — عبر SIP Trunk (مزود سعودي: STC/Mobily/Zain Business).
4. **Publish** — اضغط Publish في ElevenLabs بعد أي تعديل.
5. **اختبار end-to-end** — مريض جديد→زراعة→تأهيل→حجز / مريض قديم→تعديل / إلغاء / FAQ / تحويل.
6. **(اختياري) مطابقة البيانات** — الـ prompt فيه 12 دكتور وساعات افتراضية؛ بينما Supabase (`doctors`=4، `clinic_info`) فيه بيانات حقيقية مختلفة (عيادة متعددة التخصصات، دوام أحد-خميس ٨ص-١٠م، الجمعة مغلق). قرّر أيهما المعتمد.

---

## 11) WhatsApp + SMS (مناقَش — لم يُبنَ بعد)
- التأكيد بعد المكالمة: واتساب، ولو ما عنده واتساب → SMS عبر Twilio (fallback).
- n8n = **outgoing فقط** (تذكيرات + حملات تسويقية bulk)، لا يتدخّل في الحجز.

---

_آخر تحديث: 2026-06-01_
