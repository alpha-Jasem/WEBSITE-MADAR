import re,json
body=open('site.body.html',encoding='utf-8').read()
svg=open('stage_svg.html',encoding='utf-8').read()
body=re.sub(r'<svg id="sv".*?</svg>',lambda m:svg,body,count=1,flags=re.S)
# --- map text extras
if 'id="mn"' not in body:
    body=body.replace('<div class="sts">','<div class="mcount"><b id="mn">01</b><span>/ 05</span></div><div class="sts">',1)
    body=body.replace('ويُرسل التأكيد تلقائياً.</p></div>','ويُرسل التأكيد تلقائياً.</p><ul class="rlog"><li>استلام رسالة واتساب</li><li>فهم النية: حجز موعد</li><li>فحص التقويم والأوقات المتاحة</li><li>حجز الموعد الخميس 5:30 م</li><li>إرسال التأكيد للعميل</li></ul></div>',1)
# --- phone
newphone='''<div class="phw rvl" id="phw"><div class="phx" id="phx"><i class="notch"></i><div class="pxh"><img src="{{LOGO}}" alt=""><div>نشاطك التجاري<small>متصل الآن</small></div></div><div class="pxm" id="pm"></div><div class="pxi"><span id="pt"></span><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div></div><div class="fc fc1">✓ موعد محجوز</div><div class="fc fc2">📄 عرض سعر أُرسل</div><div class="fc fc3">↪ تحويل لموظف بملخص</div></div>'''
body=re.sub(r'<div class="phone rvl">.*?</div></div></div></div>\n','',body,count=1,flags=re.S) if '<div class="phone rvl">' in body else body
if 'id="phx"' not in body:
    body=body.replace('<div class="ck" id="wal"></div></div>\n','<div class="ck" id="wal"></div></div>\n'+newphone+'</div>\n',1) if False else body
open('/tmp/body_dbg.html','w',encoding='utf-8').write(body[body.find('id="agents"'):body.find('id="agents"')+1800])
open('site.body.html','w',encoding='utf-8').write(body)
