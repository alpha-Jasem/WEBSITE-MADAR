import json
# stylised Saudi outline (lon,lat), clockwise from Aqaba
P=[(34.95,29.35),(36.07,29.19),(37.5,30.4),(38.0,30.5),(37.0,31.5),(39.2,32.15),(40.0,31.9),(42.0,31.1),(44.7,29.2),(46.5,29.1),(47.6,28.95),(48.4,28.5),(48.6,27.8),(49.2,27.0),(50.0,26.2),(50.15,25.6),(50.8,24.8),(51.3,24.2),(51.6,24.25),(52.6,22.9),(55.2,22.7),(55.7,22.0),(55.0,20.0),(52.0,19.0),(49.0,18.6),(48.2,18.2),(47.0,17.4),(46.3,16.9),(44.5,17.4),(43.2,17.4),(42.8,16.7),(42.6,16.8),(42.7,18.5),(41.2,20.0),(40.2,21.3),(39.2,21.5),(38.5,23.5),(37.2,24.8),(36.6,26.0),(35.6,27.7)]
K=26;OX,OY=118,96
def pr(lon,lat):return (round(OX+(lon-34.5)*K,1),round(OY+(32.5-lat)*K,1))
path='M'+' L'.join('%s %s'%pr(*p) for p in P)+'Z'
C=[('جدة',39.17,21.54,1),('الرياض',46.7,24.7,0),('الدمام',50.1,26.4,0),('المدينة',39.6,24.5,0),('تبوك',36.6,28.4,0),('أبها',42.5,18.2,0),('القصيم',43.97,26.3,0),('حائل',41.7,27.5,0),('نجران',44.1,17.5,0)]
J=pr(39.17,21.54)
cities='';arcs=''
for n,lo,la,h in C:
    x,y=pr(lo,la)
    cities+=f'<g class="e" data-st="0" data-dim="1,2,3,4"><circle class="cd{" jd" if h else ""}" cx="{x}" cy="{y}" r="{7 if h else 4.5}"/>{"<circle class=pulse cx=%s cy=%s r=7 />"%(x,y) if h else ""}<text x="{x+ (10 if lo<44 or h else -10)}" y="{y+4}" class="cl" text-anchor="{"start" if (lo<44 or h) else "end"}">{n}</text></g>'
    if not h:
        mx,my=(J[0]+x)/2,(J[1]+y)/2-60
        d=f'M{J[0]} {J[1]} Q{round(mx)} {round(my)} {x} {y}'
        arcs+=f'<g class="e" data-st="0"><path class="ln arc" d="{d}" pathLength="1" id="a{len(arcs)}"/><circle r="3" class="mv"><animateMotion dur="{2.2+ (x%7)/6:.1f}s" repeatCount="indefinite" path="{d}"/></circle></g>'
ICONS={
'wa':'<use href="#b-wa" x="-12" y="-12" width="24" height="24"/>',
'tt':'<use href="#b-tt" x="-11" y="-11" width="22" height="22"/>',
'ph':'<path d="M-7 -9h5l2 5-3 2a10 10 0 0 0 5 5l2-3 5 2v5c-10 1-18-7-16-16z" transform="scale(.8)"/>',
'ig':'<use href="#b-ig" x="-12" y="-12" width="24" height="24"/>',
'web':'<circle r="9"/><path d="M-9 0h18M0 -9c4 4 4 14 0 18M0 -9c-4 4-4 14 0 18"/>',
'shop':'<path d="M-9 -4l2 -6h14l2 6v13h-18zM-9 -4h18M-3 9v-7h6v7"/>',
'mail':'<rect x="-10" y="-7" width="20" height="14" rx="2"/><path d="M-10 -5l10 7 10 -7"/>',
'kb':'<path d="M-8 -9h12a3 3 0 0 1 3 3v15h-12a3 3 0 0 1-3-3z"/><path d="M-5 -4h8M-5 0h8"/>',
'cal':'<rect x="-9" y="-8" width="18" height="17" rx="2"/><path d="M-9 -2h18M-4 -11v5M4 -11v5"/>',
'crm':'<circle cx="-3" cy="-3" r="4"/><circle cx="6" cy="-1" r="3"/><path d="M-10 9c0-4 3-6 7-6s7 2 7 6"/>',
'ord':'<path d="M-9 -9h4l2 12h12l2-8h-16"/><circle cx="-1" cy="8" r="1.5"/><circle cx="9" cy="8" r="1.5"/>',
'usr':'<circle cy="-4" r="5"/><path d="M-10 10c0-5 4-8 10-8s10 3 10 8"/>',
}
def node(x,y,ic,label,st,dim='',side='r',cls='',sub=''):
    tx=x+30 if side=='r' else x-30
    anc='start' if side=='r' else 'end'
    return f'<g class="e nd {cls}" data-st="{st}" data-dim="{dim}"><circle class="nc" cx="{x}" cy="{y}" r="22"/><g class="ni" transform="translate({x} {y})">{ICONS[ic]}</g><text class="nl" x="{tx}" y="{y+(1 if sub else 5)}" text-anchor="{anc}">{label}</text>{f'<text class="sb" x="{tx}" y="{y+17}" text-anchor="{anc}">{sub}</text>' if sub else ''}</g>'
H=(400,320)
def line(x1,y1,x2,y2,st,dim='',col=''):
    cx=(x1+x2)/2; d=f'M{x1} {y1} C{cx} {y1} {cx} {y2} {x2} {y2}'
    return f'<g class="e" data-st="{st}" data-dim="{dim}"><path class="ln {col}" d="{d}" pathLength="1"/><circle r="3.2" class="mv {col}"><animateMotion dur="2.6s" repeatCount="indefinite" path="{d}"/></circle><circle r="2.4" class="mv {col}"><animateMotion dur="2.6s" begin="-1.3s" repeatCount="indefinite" path="{d}"/></circle></g>'
ch=[('wa','واتساب'),('ph','مكالمات'),('ig','إنستغرام'),('web','دردشة الموقع'),('shop','متجر سلة'),('tt','تيك توك')]
chs='';chl=''
for i,(ic,l) in enumerate(ch):
    y=110+i*84
    chl+=line(150,y,372,320,'1,2')
    chs+=node(120,y,ic,l,'1,2','','r')
tools=[('kb','قاعدة المعرفة','قراءة فقط'),('cal','التقويم','قراءة + كتابة'),('crm','جهات الاتصال','قراءة + كتابة'),('ord','الطلبات','قراءة فقط')]
tl='';ts=''
for i,(ic,l,sb) in enumerate(tools):
    y=150+i*106
    tl+=line(428,320,650,y,'2')
    ts+=node(680,y,ic,l,'2','','l','',sb)
rip='<g class="e" data-st="1"><circle class="rp" cx="400" cy="320" r="54"/><circle class="rp" style="animation-delay:1s" cx="400" cy="320" r="54"/><circle class="rp" style="animation-delay:2s" cx="400" cy="320" r="54"/></g>'
hub=f'<g class="e hub" data-st="1,2,3,4" data-dim=""><circle class="hr1" cx="400" cy="320" r="54"/><circle class="hr2" cx="400" cy="320" r="38"/><image href="{{{{LOGO}}}}" x="378" y="298" width="44" height="44"/><text x="400" y="394" text-anchor="middle" class="nl hb">وكيل مدار</text></g>'
# automation chain stage 3
def box(x,y,t,l,c):
    return f'<g class="e ab {c}" data-st="3" data-dim=""><rect x="{x}" y="{y}" width="200" height="84" rx="16"/><text x="{x+100}" y="{y+26}" text-anchor="middle" class="ak">{t}</text><text x="{x+100}" y="{y+56}" text-anchor="middle" class="al">{l}</text></g>'
auto=box(70,480,'TRIGGER','وصلت رسالة حجز','tr')+box(300,480,'CONDITION','القناة واتساب؟','cd2')+box(530,480,'ACTION','احجز وأرسل تأكيد','ac')
auto+='<g class="e" data-st="3"><path class="ln" d="M400 374V480" pathLength="1"/><path class="ln" d="M270 522H300" pathLength="1"/><path class="ln" d="M500 522H530" pathLength="1"/></g>'
# stage 4 : staff + outputs
staff=f'<g class="e nd" data-st="4" data-dim=""><circle class="nc amber" cx="400" cy="92" r="24"/><g class="ni" transform="translate(400 92)">{ICONS["usr"]}</g><text class="nl" x="436" y="97">موظف يستلم بملخص</text></g>'
staffl='<g class="e" data-st="4"><path class="ln amber" d="M400 266 L400 116" pathLength="1" stroke-dasharray="4 5"/></g>'
outs=''.join(f'<g class="e ab out" data-st="4" data-dim=""><rect x="{x}" y="500" width="170" height="52" rx="14"/><text x="{x+85}" y="532" text-anchor="middle" class="al">{t}</text></g>' for x,t in [(105,'موعد محجوز'),(315,'عرض سعر مرسل'),(525,'تقرير يومي')])
outl='<g class="e" data-st="4"><path class="ln" d="M400 374 V430 M190 430 H610 M190 430 V500 M400 430 V500 M610 430 V500" pathLength="1"/></g>'
svg=f'''<svg id="sv" viewBox="50 56 700 570" role="img" aria-label="خريطة الربط والأتمتة"><defs><radialGradient id="mg" cx="50%" cy="40%"><stop offset="0" stop-color="#2c5fe0" stop-opacity=".35"/><stop offset="1" stop-color="#6c4fe8" stop-opacity=".08"/></radialGradient></defs>
<g id="mapg"><path class="ksa" d="{path}"/>{cities}{arcs}</g>{rip}{chl}{tl}{chs}{ts}{hub}{auto}{staffl}{staff}{outl}{outs}</svg>'''
open('stage_svg.html','w',encoding='utf-8').write(svg)
print(len(svg))
