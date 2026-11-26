# Builds the platform-only page (Faisal's developer console) exactly as build_site.py composes it, without the marketing site,
# and writes it as a TypeScript module so the admin can mount it in an iframe (srcdoc).
#   cd claude-session/src && python build_platform.py
# Nothing of the platform's look, text, screens or demo data is changed. Only the boot differs: it starts already signed in as
# the developer (the visitor is already an authenticated admin), and "logout" returns to the admin instead of the fake login.
import base64, json, sys
sys.path.insert(0, '.')
import brands

logo = 'data:image/png;base64,' + base64.b64encode(open('../../public/admin-logo-mark.png', 'rb').read()).decode()
_p = [open(f, encoding='utf-8').read() for f in ('pf1.js', 'pf2.js', 'pf3.js', 'pf4.js', 'pf5.js', 'pf6.js', 'pf7.js', 'pf8.js')]
pricing = open('pricing.json', encoding='utf-8').read()
pfjs = 'var PRICING=' + pricing + ';' + _p[0].replace('/*PF2*/', _p[1] + _p[2] + _p[3] + _p[4] + _p[5] + _p[6] + _p[7])
css = open('site.css', encoding='utf-8').read() + open('pf.css', encoding='utf-8').read()

# Signed-in boot: pf1.js reads this key and opens the developer dashboard for Faisal's developer user.
boot = "try{sessionStorage.setItem('madar-pf','dev:f')}catch(e){}location.hash='platform';"

# ---- Admin extension (clearly separate from Faisal's own code) -------------------------------------------------------------
# Adds a collapsible group "الإدارة" to his sidebar and two buttons (admin search, admin alerts) to his top bar. The new items open the
# real admin pages: this page only tells the parent window which one to show over the content area (postMessage); the admin renders it.
ext = r"""
(function(){
var P=window.__pf;if(!P)return;var S=P.S,V=P.V,ACT=P.ACT,ic=P.ic;
var G=[['الإدارة','s',[['adm_sales','المبيعات','chart'],['adm_ai','الإيجنت AI','bot'],['adm_campaigns','الحملات','mega'],['adm_customers','العملاء','team'],['adm_ops','التشغيل','plug'],['adm_finance','المالية','card'],['adm_create','إنشاء عميل','plus'],['adm_team','الفريق','user'],['adm_marketers','المسوّقون','team'],['adm_settings','الإعدادات','gear']]]];
var LABEL={dhome:'مركز القيادة'};V.dhome=function(){return '<div class="card" style="padding:30px;text-align:center;color:var(--mute)">جارٍ التحميل...</div>'};G.forEach(function(g){g[2].forEach(function(i){LABEL[i[0]]=i[1];V[i[0]]=function(){return '<div class="card" style="padding:30px;text-align:center;color:var(--mute)">جارٍ التحميل...</div>'}})});
/* his demo-data screens that the admin group covers with real data are hidden from his sidebar */
var hide=document.createElement('style');hide.textContent=['dcli','dsubs','drep','quotes','dreq','dord','dav'].map(function(v){return '.nv[data-v="'+v+'"]'}).join(',')+'{display:none!important}';document.head.appendChild(hide);
function post(m){try{parent.postMessage(m,'*')}catch(e){}}
function rect(){var v=document.getElementById('view');if(!v)return null;var r=v.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height}}
function tell(){var t=document.getElementById('ttl');if(t&&LABEL[S.view])t.textContent=LABEL[S.view];var sd=document.getElementById('side');post({madar:'faisal-view',view:S.view,rect:rect(),drawer:!!(sd&&sd.classList.contains('open'))})}
window.__pfExtraNav=function(){setTimeout(tell,0)};
window.addEventListener('resize',tell);
/* phone: the drawer sits inside this page, so the admin page laid over the content must step aside while it is open; a tap outside closes it */
var hs=document.createElement('style');hs.textContent='@media(max-width:820px){.tb{gap:6px}.tb h1{min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:16px}}';document.head.appendChild(hs);
var _m=ACT.menu;ACT.menu=function(el){_m(el);tell()};
document.addEventListener('click',function(e){var sd=document.getElementById('side');if(sd&&sd.classList.contains('open')&&!(e.target.closest&&(e.target.closest('#side')||e.target.closest('[data-a="menu"]')))){sd.classList.remove('open');tell()}},true);
ACT.admgrp=function(el){var w=document.getElementById('admg-'+el.dataset.k);if(w){w.hidden=!w.hidden;el.classList.toggle('on',!w.hidden)}};
ACT.admsearch=function(){post({madar:'faisal-act',act:'search'})};
ACT.admbell=function(){post({madar:'faisal-act',act:'bell'})};
function inject(){
 if(S.role!=='dev')return;var side=document.getElementById('side'),sp=side&&side.querySelector('.sp');if(!sp||document.getElementById('admg-s'))return;
 var h='';G.forEach(function(g){var open=true;
  h+='<button class="nv'+(open?' on':'')+'" data-a="admgrp" data-k="'+g[1]+'">'+ic('chev')+g[0]+'</button><div id="admg-'+g[1]+'"'+(open?'':' hidden')+'>'+g[2].map(function(i){return '<button class="nv sub" data-v="'+i[0]+'" data-a="nav">'+ic(i[2])+i[1]+'</button>'}).join('')+'</div>'});
 sp.insertAdjacentHTML('beforebegin',''+h);
 var me=document.querySelector('.tb .me');
 if(me&&!document.getElementById('admbtn'))me.insertAdjacentHTML('beforebegin','<span id="admbtn" style="display:contents"><button class="ib" data-a="admsearch" aria-label="بحث الإدارة" title="بحث الإدارة">'+ic('search')+'</button><button class="ib" data-a="admbell" aria-label="تنبيهات الإدارة" title="تنبيهات الإدارة">'+ic('bell')+'</button></span>');
 tell()}
var app=document.getElementById('app');if(app)new MutationObserver(inject).observe(app,{childList:true,subtree:false});
inject();
})();
"""
# Leaving: the platform's own logout and its link back to the marketing site both return to the admin.
after = ("(function(){var go=function(){try{parent.postMessage({madar:'faisal-exit'},'*')}catch(e){}};"
         "if(window.__pf&&window.__pf.ACT)window.__pf.ACT.logout=go;"
         "document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-site]')){e.preventDefault();e.stopPropagation();go()}},true)})();")

doc = ('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500&display=swap">'
       '<style>' + css + '</style></head><body class="pf">' + brands.sprite() +
       '<div id="platform"><div id="app"></div></div><script>window.__LOGO=' + json.dumps(logo) + ';' + boot + '</script>'
       '<script>' + pfjs + '</script><script>window.__route&&window.__route();' + ext + after + '</script></body></html>')

out = '../../src/faisal/platformDoc.ts'
open(out, 'w', encoding='utf-8').write(
    '// Generated by claude-session/src/build_platform.py. Do not edit by hand.\nconst doc: string = ' + json.dumps(doc).replace('</', '<\\/') + '\nexport default doc\n')
print(len(doc), 'chars ->', out)
