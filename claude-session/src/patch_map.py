import re,json
body=open('site.body.html',encoding='utf-8').read()
svg=open('stage_svg.html',encoding='utf-8').read()
STG=[
('BORN IN JEDDAH','من جدة، <em>نخدم المملكة</em>','نبني وكلاء ذكاء اصطناعي يخدمون أعمالاً في كل مدينة. نقطة البداية جدة، والربط يمتد لأي مكان تعمل فيه.'),
('CHANNELS','كل القنوات، <em>مدخل واحد</em>','واتساب، مكالمات، إنستغرام، موقعك ومتجرك. كل رسالة تصل لوكيل واحد يعرف السياق كاملاً.'),
('KNOWLEDGE & TOOLS','يفهم، يبحث، <em>ويستخدم أدواتك</em>','يجيب من قاعدة معرفتك فقط، ويقرأ أو يكتب في التقويم وجهات الاتصال والطلبات حسب الصلاحيات التي تحددها.'),
('AUTOMATION','الأتمتة: <em>لو حصل، نفّذ</em>','تضع القاعدة مرة واحدة: مشغّل، ثم شرط، ثم إجراء. مثال: وصلت رسالة حجز على واتساب، يُحجز الموعد ويُرسل التأكيد تلقائياً.'),
('HUMAN IN THE LOOP','الموظف يتدخل <em>عند الحاجة فقط</em>','الحالات الحساسة تنتقل لموظف مع ملخص جاهز، والباقي يخرج منظماً: مواعيد، عروض أسعار، وتقرير يومي.')]
st=''.join(f'<div class="st{" on" if i==0 else ""}"><p class="eyebrow">{e}</p><h2>{h}</h2><p class="sub">{p}</p></div>' for i,(e,h,p) in enumerate(STG))
sec=f'''<section id="map" aria-label="خريطة الربط"><div class="stick"><div class="wrap mg"><div class="mt"><div class="sts">{st}</div><div class="sprog" id="sprog">{"".join('<button type="button" aria-label="المرحلة %d"><i></i></button>'%(i+1) for i in range(5))}</div></div><div class="mvz">{svg}</div></div></div></section>
'''
# replace chaos section
body=re.sub(r'<section class="sec" id="chaos".*?</section>\n','',body,flags=re.S)
if 'id="map"' not in body:
    body=body.replace('</header>\n','</header>\n\n'+sec,1)
assert 'id="map"' in body and 'id="chaos"' not in body
open('site.body.html','w',encoding='utf-8').write(body)
# css
css='''
/* ---- pinned connection map ---- */
#map{position:relative;height:520vh}#map .stick{position:sticky;top:0;height:100vh;height:100svh;display:flex;align-items:center;padding-top:64px;overflow:hidden}
#map .mg{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:30px;align-items:center;width:100%}
#map .sts{display:grid}#map .st{grid-area:1/1;opacity:0;transform:translateY(16px);transition:opacity .5s,transform .5s;pointer-events:none}#map .st.on{opacity:1;transform:none;pointer-events:auto}
#map .st h2{font-size:clamp(28px,3.6vw,48px);margin:8px 0 12px}
.sprog{display:flex;gap:8px;margin-top:26px}.sprog button{all:unset;cursor:pointer;flex:1;height:18px;display:flex;align-items:center}.sprog button i{display:block;width:100%;height:4px;border-radius:4px;background:var(--line);transition:background .4s,box-shadow .4s}.sprog button.on i{background:var(--hi);box-shadow:0 0 12px var(--hi)}.sprog button.pass i{background:rgba(90,123,255,.5)}
#sv{width:100%;height:auto;max-height:calc(100svh - 110px);direction:ltr;overflow:visible}
#sv .e{opacity:0;transition:opacity .7s}#sv .e.v{opacity:1}#sv .e.d{opacity:.22}
#sv .ln{fill:none;stroke:var(--hi);stroke-width:1.6;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.3s ease}#sv .e.v .ln,#sv .e.d .ln{stroke-dashoffset:0}
#sv .ln.arc{stroke:rgba(90,123,255,.55);stroke-width:1.2}#sv .ln.amber{stroke:var(--warn);stroke-dasharray:.04 .03}
#sv .mv{fill:#fff;filter:drop-shadow(0 0 4px var(--hi))}
#mapg{transition:opacity .8s}
#sv .ksa{fill:url(#mg);stroke:var(--hi);stroke-width:1.6;stroke-linejoin:round;filter:drop-shadow(0 0 14px rgba(44,95,224,.45))}
#sv .cd{fill:var(--hi)}#sv .cd.jd{fill:#fff}#sv .pulse{fill:none;stroke:var(--hi);stroke-width:1.5;transform-box:fill-box;transform-origin:center;animation:mpl 2s ease-out infinite}
@keyframes mpl{from{transform:scale(1);opacity:.9}to{transform:scale(3.4);opacity:0}}
#sv .cl{fill:var(--mute);font-size:13px;font-weight:700}
#sv .nc{fill:var(--card);stroke:var(--line);stroke-width:1.5}#sv .nc.amber{stroke:var(--warn)}
#sv .ni{fill:none;stroke:var(--ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
#sv .nl{fill:var(--ink);font-size:14px;font-weight:700}#sv .nl.hb{fill:var(--hi)}
#sv .hr1{fill:rgba(44,95,224,.14);stroke:var(--hi);stroke-width:1.5;transform-box:fill-box;transform-origin:center;animation:hp 3s ease-in-out infinite}#sv .hr2{fill:var(--card);stroke:var(--violet);stroke-width:1.5}
@keyframes hp{50%{transform:scale(1.08)}}
#sv .ab rect{fill:var(--card);stroke:var(--line);stroke-width:1.5}#sv .ab.tr rect{stroke:var(--hi)}#sv .ab.cd2 rect{stroke:var(--warn)}#sv .ab.ac rect{stroke:var(--ok)}#sv .ab.out rect{stroke:var(--ok);fill:rgba(61,220,151,.08)}
#sv .ak{fill:var(--mute);font-size:11px;letter-spacing:.14em;font-weight:800}#sv .al{fill:var(--ink);font-size:15px;font-weight:700}
@media(max-width:820px){#map{height:480vh}#map .stick{align-items:flex-start;padding-top:70px}#map .mg{grid-template-columns:1fr;gap:6px}#map .st h2{font-size:26px;margin:4px 0 6px}#map .st .sub{font-size:14px;margin:0}#sv{max-height:52svh}.sprog{margin-top:12px}}
@media(prefers-reduced-motion:reduce){#sv .mv{display:none}#sv .pulse,#sv .hr1{animation:none}}
'''
open('site.css','a',encoding='utf-8').write(css) if '/* ---- pinned connection map' not in open('site.css',encoding='utf-8').read() else None
# js
b=open('build_site.py',encoding='utf-8').read()
b=b.replace("['chaos','فوضى الرسائل']","['map','خريطة الربط']").replace("['services','الخدمات'],['engine'","['map','خريطة الربط'],['services','الخدمات'],['engine'") if False else b
b=b.replace("['top','البداية'],['services','الخدمات']","['top','البداية'],['map','خريطة الربط'],['services','الخدمات']").replace("['chaos','فوضى الرسائل'],","")
js=r'''
(function(){var m=$('map'),els=[].slice.call(m.querySelectorAll('.e')),sts=[].slice.call(m.querySelectorAll('.st')),bs=[].slice.call($('sprog').children),mg=$('mapg'),cur=-1,red=matchMedia('(prefers-reduced-motion:reduce)').matches;
els.forEach(function(e){e._s=(e.dataset.st||'').split(',');e._d=(e.dataset.dim||'').split(',')});
function setSt(n){if(n===cur)return;cur=n;var k=String(n);els.forEach(function(e){var v=e._s.indexOf(k)>-1,d=!v&&e._d.indexOf(k)>-1;e.classList.toggle('v',v);e.classList.toggle('d',d)});mg.style.opacity=n===0?1:.12;sts.forEach(function(s,i){s.classList.toggle('on',i===n)});bs.forEach(function(b,i){b.classList.toggle('on',i===n);b.classList.toggle('pass',i<n)})}
function calc(){if(red){setSt(4);return}var r=m.getBoundingClientRect(),t=-r.top,rng=m.offsetHeight-innerHeight;if(rng<=0)return;var p=Math.min(.999,Math.max(0,t/rng));setSt(Math.floor(p*5))}
if(red){m.style.height='auto';m.querySelector('.stick').style.position='static';m.querySelector('.stick').style.height='auto';sts.forEach(function(s,i){if(i<4)s.style.display='none'})}
addEventListener('scroll',calc,{passive:true});addEventListener('resize',calc);calc();
bs.forEach(function(b,i){b.addEventListener('click',function(){if(red)return;var rng=m.offsetHeight-innerHeight,y=m.getBoundingClientRect().top+scrollY+rng*(i+.5)/5;scrollTo({top:y,behavior:'smooth'})})});})();
'''
if "$('sprog')" not in b:
    b=b.replace("var TR={",js+"\nvar TR={",1)
# translations
mm=re.search(r'var TR=(\{.*?\});\n',b,flags=re.S)
TR=json.loads(mm.group(1))
EN={'من جدة،':'From Jeddah,','نخدم المملكة':'we serve the Kingdom','نبني وكلاء ذكاء اصطناعي يخدمون أعمالاً في كل مدينة. نقطة البداية جدة، والربط يمتد لأي مكان تعمل فيه.':'We build AI agents that serve businesses in every city. We start in Jeddah, and the connections reach wherever you work.',
'كل القنوات،':'Every channel,','مدخل واحد':'one entrance','واتساب، مكالمات، إنستغرام، موقعك ومتجرك. كل رسالة تصل لوكيل واحد يعرف السياق كاملاً.':'WhatsApp, calls, Instagram, your site and store. Every message reaches one agent that knows the full context.',
'يفهم، يبحث،':'Understands, searches,','ويستخدم أدواتك':'and uses your tools','يجيب من قاعدة معرفتك فقط، ويقرأ أو يكتب في التقويم وجهات الاتصال والطلبات حسب الصلاحيات التي تحددها.':'Answers only from your knowledge base, and reads or writes in your calendar, contacts and orders based on the permissions you set.',
'الأتمتة:':'Automation:','لو حصل، نفّذ':'if it happens, do it','تضع القاعدة مرة واحدة: مشغّل، ثم شرط، ثم إجراء. مثال: وصلت رسالة حجز على واتساب، يُحجز الموعد ويُرسل التأكيد تلقائياً.':'Set the rule once: trigger, then condition, then action. Example: a booking message arrives on WhatsApp, the appointment is booked and the confirmation is sent automatically.',
'الموظف يتدخل':'Your team steps in','عند الحاجة فقط':'only when needed','الحالات الحساسة تنتقل لموظف مع ملخص جاهز، والباقي يخرج منظماً: مواعيد، عروض أسعار، وتقرير يومي.':'Sensitive cases go to a team member with a ready summary, and the rest comes out organized: appointments, quotes and a daily report.',
'خريطة الربط والأتمتة':'Connection and automation map','خريطة الربط':'Connection map','المرحلة 1':'Stage 1','المرحلة 2':'Stage 2','المرحلة 3':'Stage 3','المرحلة 4':'Stage 4','المرحلة 5':'Stage 5',
'جدة':'Jeddah','الرياض':'Riyadh','الدمام':'Dammam','المدينة':'Madinah','تبوك':'Tabuk','أبها':'Abha','القصيم':'Qassim','حائل':'Hail','نجران':'Najran',
'واتساب':'WhatsApp','مكالمات':'Calls','إنستغرام':'Instagram','دردشة الموقع':'Site chat','متجر سلة':'Salla store','البريد':'Email',
'قاعدة المعرفة':'Knowledge base','التقويم':'Calendar','جهات الاتصال':'Contacts','الطلبات':'Orders','وكيل مدار':'Madar agent',
'وصلت رسالة حجز':'Booking message arrives','القناة واتساب؟':'Channel is WhatsApp?','احجز وأرسل تأكيد':'Book and send confirmation','موظف يستلم بملخص':'Team member takes over with summary',
'موعد محجوز':'Appointment booked','عرض سعر مرسل':'Quote sent','تقرير يومي':'Daily report'}
for k,v in EN.items(): TR.setdefault(k,v)
b=b[:mm.start()]+'var TR='+json.dumps(TR,ensure_ascii=False)+';\n'+b[mm.end():]
open('build_site.py','w',encoding='utf-8').write(b)
