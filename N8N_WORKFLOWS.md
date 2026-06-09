# Madar OS — n8n Workflows

**Instance:** keepcalm.app.n8n.cloud  
**Project:** Madar Car Wash OS

---

## الـ Workflows الشغّالة

### 1. CW — Car Ready
| | |
|---|---|
| **ID** | `CgNByUoakusgFtdh` |
| **الحالة** | ✅ Active |
| **النوع** | Webhook |
| **الوصف** | يُرسل واتساب للعميل عند الضغط على "جاهزة" في لوحة التشغيل |
| **المُحرّك** | `CarWashQueue.tsx` → POST إلى webhook عند تغيير الحالة إلى `ready` |
| **القالب** | `cw_message_templates.car_ready` |
| **المتغيرات** | `{{customer_name}}`, `{{company_name}}` |

---

### 2. CW — Delivery Receipt
| | |
|---|---|
| **ID** | `68uBXiSG17k2sVgK` |
| **الحالة** | ✅ Active |
| **النوع** | Webhook |
| **الوصف** | يُرسل فاتورة واتساب عند تأكيد التسليم والدفع |
| **المُحرّك** | `CarWashQueue.tsx` → POST إلى webhook عند الضغط على "تسليم" |
| **القالب** | `cw_message_templates.delivery_receipt` (عادي) أو `delivery_receipt_free` (غسلة مجانية) |
| **المتغيرات** | `{{customer_name}}`, `{{company_name}}`, `{{service}}`, `{{total}}`, `{{payment_method}}` |

---

### 3. CW — Loyalty Milestone
| | |
|---|---|
| **ID** | `sWsRnYASuXkBGqVg` |
| **الحالة** | ✅ Active |
| **النوع** | Webhook |
| **الوصف** | يُرسل تهنئة عند اكتمال كل 5 غسلات (الغسلة المجانية) |
| **المُحرّك** | `CarWashQueue.tsx` → POST إلى webhook عند اكتشاف milestone |
| **القالب** | `cw_message_templates.loyalty_milestone` |
| **المتغيرات** | `{{customer_name}}`, `{{company_name}}` |

---

### 4. CW — Daily Closing Summary
| | |
|---|---|
| **ID** | `87ZozsubuZKMHlQM` |
| **الحالة** | ✅ Active |
| **النوع** | Webhook |
| **الوصف** | يُرسل ملخص اليوم (مبيعات + أرباح) للمالك عند إغلاق اليوم |
| **المُحرّك** | `CarWashDailyClosing.tsx` → POST إلى webhook عند الإغلاق |
| **الإرسال** | رقم الواتساب في `companies` (owner phone) |

---

### 5. CW — Review Request
| | |
|---|---|
| **ID** | `ha1czJz9biXRwf2l` |
| **الحالة** | ✅ Active |
| **النوع** | Schedule |
| **الجدول** | كل 30 دقيقة |
| **الوصف** | يجلب الزيارات المنجزة حيث `review_request_sent = false` + `phone not null` + مرّ عليها `delay_hours` ويرسل رابط التقييم |
| **الشروط** | `cw_automations.review_request.enabled ≠ false` + `google_maps_url` موجود |
| **القالب** | `cw_message_templates.review_request` أو الافتراضي |
| **DB Update** | يُحدّث `cw_visits.review_request_sent = true` بعد الإرسال |

---

### 6. CW — Daily Reactivation
| | |
|---|---|
| **ID** | `vq1gQYjkIJKybnR8` |
| **الحالة** | ✅ Active |
| **النوع** | Schedule |
| **الجدول** | يومياً الساعة 10:00ص |
| **الوصف** | يجلب العملاء الذين لم يزوروا منذ 30+ يوم ويُرسل رسالة إعادة تنشيط |
| **الشروط** | `cw_automations.daily_reactivation.enabled ≠ false` |
| **القالب** | `cw_message_templates.daily_reactivation` أو الافتراضي |
| **المتغيرات** | `{{customer_name}}`, `{{company_name}}` |

---

### 7. CW — Post Followup
| | |
|---|---|
| **ID** | `RAbkhh9ezwXzfYzX` |
| **الحالة** | ✅ Active |
| **النوع** | Schedule |
| **الجدول** | كل ساعة |
| **الوصف** | يجلب الزيارات حيث `followup_sent = false` + مرّ عليها `delay_hours` (افتراضي 3) ويرسل رسالة متابعة |
| **الشروط** | `cw_automations.post_followup.enabled ≠ false` |
| **القالب** | `cw_message_templates.post_followup` أو الافتراضي |
| **DB Update** | يُحدّث `cw_visits.followup_sent = true` بعد الإرسال |
| **ملاحظة** | يحتاج عمود `followup_sent boolean default false` في `cw_visits` |

---

### 8. CW — Weekly Promo (AI)
| | |
|---|---|
| **ID** | `AI2w9rEvadzgzibU` |
| **الحالة** | ✅ Active |
| **النوع** | Schedule |
| **الجدول** | كل خميس الساعة 9:00ص (cron: `0 9 * * 4`) |
| **الوصف** | يُولّد عرضاً أسبوعياً مخصصاً بالذكاء الاصطناعي (GPT-4o-mini) لكل مغسلة ويرسله لجميع العملاء النشطين (زاروا خلال 60 يوم) |
| **الشروط** | `cw_automations.weekly_promo.enabled ≠ false` |
| **Env Var** | `OPENAI_API_KEY` مطلوب في n8n |

---

### 9. CW — First Visit Welcome
| | |
|---|---|
| **ID** | `lokB9RPSn9BPxE2v` |
| **الحالة** | ✅ Active |
| **النوع** | Schedule |
| **الجدول** | كل 30 دقيقة |
| **الوصف** | يجلب العملاء حيث `total_visits=1` + `welcome_sent=false` + `last_visit_at >= 30 دقيقة` ويرسل رسالة شكر + ولاء + Google Maps |
| **الشروط** | `cw_automations.car_ready.enabled ≠ false` كـ proxy + `maps_url` موجود يُقرأ من `companies.google_maps_url` |
| **القالب** | `cw_message_templates.first_visit_welcome` أو الافتراضي |
| **المتغيرات** | `{{customer_name}}`, `{{company_name}}`, `{{maps_url}}` |
| **DB Update** | يُحدّث `cw_customers.welcome_sent = true` بعد الإرسال |

---

### 10. CW — Manual Campaigns
| | |
|---|---|
| **ID** | `EgpyFbFwTrD76Je7` |
| **الحالة** | ✅ Active |
| **النوع** | Schedule |
| **الجدول** | كل دقيقتين |
| **الوصف** | يجلب الحملات اليدوية من `cw_campaigns` حيث `status = pending`، يُرسل واتساب لكل رقم، يُحدّث الحالة إلى `sent` |
| **المُحرّك** | `CarWashLeads.tsx` → INSERT في `cw_campaigns` عند الضغط على "إرسال حملة" |
| **DB** | جدول `cw_campaigns` (id, company_id, message, phones[], status, sent_count, sent_at) |

---

## Env Variables المطلوبة في n8n

| المتغير | الاستخدام |
|---|---|
| `SUPABASE_URL` | جميع الـ workflows |
| `SUPABASE_SERVICE_KEY` | جميع الـ workflows |
| `WHATSAPP_PHONE_ID` | جميع الـ workflows |
| `WHATSAPP_TOKEN` | جميع الـ workflows |
| `OPENAI_API_KEY` | CW — Weekly Promo فقط |

---

## DB Columns المطلوبة في cw_visits

| العمود | النوع | الاستخدام |
|---|---|---|
| `phone` | text | Review Request, Post Followup — للإرسال |
| `customer_name` | text | Review Request, Post Followup — في الرسالة |
| `review_request_sent` | boolean default false | Review Request |
| `followup_sent` | boolean default false | Post Followup |

---

## DB Columns المطلوبة في cw_customers

| العمود | النوع | الاستخدام |
|---|---|---|
| `welcome_sent` | boolean default false | First Visit Welcome |

---

## ملاحظات

- كل workflow يتحقق من `cw_automations.{key}.enabled` — إذا `false` يتخطى الشركة
- `delay_hours` في الـ scheduled workflows يُقرأ من `cw_automations.{key}.delay_hours` ويُديره الأدمن من AdminClientDrawer
- قوالب الرسائل تُحفظ في `companies.cw_message_templates` بصيغة `{{variable}}` — الـ UI يعرضها بصيغة `[اسم المتغير]`
