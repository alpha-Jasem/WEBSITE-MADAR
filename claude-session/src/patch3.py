import re,json
b=open('site.body.html',encoding='utf-8').read()
newphone='''<div class="phw rvl" id="phw"><div class="phx" id="phx"><i class="notch"></i><div class="pxh"><img src="{{LOGO}}" alt=""><div>نشاطك التجاري<small>متصل الآن</small></div></div><div class="pxm" id="pm"></div><div class="pxi"><span id="pt"></span><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div></div><div class="fc fc1">✓ موعد محجوز</div><div class="fc fc2">📄 عرض سعر أُرسل</div><div class="fc fc3">↪ تحويل لموظف بملخص</div></div>'''
if 'id="phx"' not in b:
    b=b.replace('<div class="ck" id="wal"></div></div>\n','<div class="ck" id="wal"></div></div>\n'+newphone+'</div>\n',1)
if 'id="cdot"' not in b: b=b.replace('<div class="sdots"','<b id="cdot"></b><u id="cring"></u>\n<div class="sdots"',1)
trust='''<section class="sec" id="trust"><div class="wrap"><p class="eyebrow">BUILT ON TRUSTED PLATFORMS</p><h2>نبني فوق <em>منصات موثوقة</em></h2><p class="sub">نربطك بنفس المنصات التي تستخدمها شركتك أصلاً، ونرافقك في التحقق وربط الحساب الرسمي مع ميتا خطوة بخطوة.</p>
<div class="tlogos rvl"><span>WhatsApp Business Platform</span><span>Meta Cloud API</span><span>Instagram</span><span>Messenger</span><span>Google Calendar</span><span>سلة</span><span>زد</span><span>Shopify</span><span>n8n</span></div>
<div class="tbad rvl"><div><i>✓</i><b>تحقق ميتا</b><small>نخدمك في توثيق النشاط التجاري وربط رقمك الرسمي.</small></div><div><i>✓</i><b>قوالب متوافقة</b><small>نبني قوالب الرسائل وفق متطلبات ميتا لتُعتمد بسرعة.</small></div><div><i>✓</i><b>بياناتك ملكك</b><small>عملاؤك ومحادثاتك داخل حسابك، وتصدّرها متى شئت.</small></div><div><i>✓</i><b>دعم من جدة</b><small>فريق يتحدث عربيتك ويفهم سوقك.</small></div></div>
<p class="tnote">أسماء المنتجات والعلامات التجارية تعود لأصحابها وتُذكر لبيان التكامل فقط.</p></div></section>
'''
if 'id="trust"' not in b: b=b.replace('<footer>',trust+'<footer>',1)
open('site.body.html','w',encoding='utf-8').write(b)
css=open('v3.css',encoding='utf-8').read()
c=open('site.css',encoding='utf-8').read()
if '/* ---- v3:' not in c: c+=css
open('site.css','w',encoding='utf-8').write(c)
js=open('v3.js',encoding='utf-8').read()
b2=open('build_site.py',encoding='utf-8').read()
if "$('phw')" not in b2: b2=b2.replace("var TR={",js+"\nvar TR={",1)
b2=b2.replace("var bbs=[].slice.call(document.querySelectorAll('#chat .bb')),T=[];","var bbs=[],T=[];")
b2=re.sub(r"new IntersectionObserver\(function\(es\)\{es\.forEach\(function\(e\)\{if\(e\.isIntersecting\)runChat\(\)\}\)\},\{threshold:\.5\}\)\.observe\(\$\('chat'\)\);","",b2)
b2=b2.replace("mg.style.opacity=n===0?1:.12;","mg.style.opacity=n===0?1:.12;$('mn').textContent='0'+(n+1);")
b2=b2.replace("els.forEach(function(e){e._s=","els.forEach(function(e,i){e.style.transitionDelay=((i%9)*70)+'ms';e._s=",1)
if "['trust'" not in b2: b2=b2.replace("['faq','أسئلة'],","['faq','أسئلة'],['trust','المنصات'],")
EN=json.load(open('v3_en.json',encoding='utf-8'))
mm=re.search(r'var TR=(\{.*?\});\n',b2,flags=re.S);TR=json.loads(mm.group(1))
for k,v in EN.items():TR.setdefault(k,v)
b2=b2[:mm.start()]+'var TR='+json.dumps(TR,ensure_ascii=False)+';\n'+b2[mm.end():]
open('build_site.py','w',encoding='utf-8').write(b2)
