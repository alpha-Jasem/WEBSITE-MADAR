
(function(){var hc=matchMedia('(hover:hover) and (pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches;if(!hc)return;var H=document.documentElement,dot=$('cdot'),ring=$('cring'),x=-100,y=-100,rx=-100,ry=-100;H.classList.add('hc');
addEventListener('mousemove',function(e){x=e.clientX;y=e.clientY;H.classList.add('cin');dot.style.transform='translate('+x+'px,'+y+'px)';var t=e.target.closest?e.target:null,c='';if(t){if(t.closest('input,textarea,select'))c='t';else if(t.closest('a,button,[role=button],label,[data-go],.ps,.gi,summary'))c='h'}ring.className=c},{passive:true});
document.addEventListener('mouseleave',function(){H.classList.remove('cin')});document.addEventListener('mouseenter',function(){H.classList.add('cin')});
addEventListener('mousedown',function(){ring.classList.add('d')});addEventListener('mouseup',function(){ring.classList.remove('d')});
(function f(){rx+=(x-rx)*.18;ry+=(y-ry)*.18;ring.style.transform='translate('+rx+'px,'+ry+'px)';requestAnimationFrame(f)})();})();
(function(){var pm=$('pm'),pt=$('pt'),w=$('phw'),px=$('phx'),red=matchMedia('(prefers-reduced-motion:reduce)').matches,run=false,tm=[],si=0;
var SC=[[['out','السلام عليكم، أبغى أحجز موعد'],['in','هلا وغلا! أي يوم يناسبك؟'],['out','الخميس بعد العصر'],['in','متاح 4:00 و5:30 مساءً. أيهم أحجز لك؟'],['out','5:30'],['ok','✓ تم حجز موعدك الخميس 5:30 م، وأرسلنا التأكيد على واتساب']],
[['out','كم سعر الباقة المتوسطة؟'],['in','الباقة المتوسطة 799 ريال شهرياً وتشمل 3 قنوات. أرسل لك عرض سعر رسمي؟'],['out','أيوه'],['ok','📄 تم إرسال عرض السعر رقم 1048']],
[['out','وين طلبي؟'],['in','طلبك رقم 5521 مع شركة التوصيل ويوصلك غداً قبل المغرب.'],['out','أبغى أكلم موظف'],['ok','↪ تم تحويلك لموظف مع ملخص المحادثة']]];
function tx(s){return(typeof LG!=='undefined'&&LG==='en'&&TR[s])?TR[s]:s}
function clr(){tm.forEach(clearTimeout);tm=[]}function at(f,d){tm.push(setTimeout(f,d))}
function add(c,t){var d=document.createElement('div');d.className='bb '+c;d.textContent=tx(t);pm.appendChild(d);while(pm.children.length>6)pm.removeChild(pm.firstChild)}
function typing(on){var o=pm.querySelector('.typ');if(o)o.remove();if(on){var d=document.createElement('div');d.className='typ';d.innerHTML='<i></i><i></i><i></i>';pm.appendChild(d)}}
function play(){if(!run)return;var sc=SC[si%SC.length],k=0;pm.innerHTML='';pt.textContent='';function step(){if(!run)return;if(k>=sc.length){at(function(){pm.style.opacity=0;at(function(){pm.style.opacity=1;si++;play()},500)},3200);return}var m=sc[k++];if(m[0]==='out'){var s=tx(m[1]),i=0;(function ty(){if(!run)return;pt.textContent=s.slice(0,++i);if(i<s.length)at(ty,38);else at(function(){pt.textContent='';add('out',m[1]);at(step,500)},350)})()}else if(m[0]==='in'){typing(true);at(function(){typing(false);add('in',m[1]);at(step,900)},1100)}else{at(function(){add('ok',m[1]);at(step,600)},500)}}step()}
function stat(){pm.innerHTML='';SC[0].forEach(function(m){add(m[0],m[1])})}
if(red){stat();return}
new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting&&!run){run=true;play()}else if(!e.isIntersecting&&run){run=false;clr()}})},{threshold:.35}).observe(w);
w.addEventListener('mousemove',function(e){var r=w.getBoundingClientRect(),a=(e.clientX-r.left)/r.width-.5,b=(e.clientY-r.top)/r.height-.5;px.style.setProperty('--ry',(a*12)+'deg');px.style.setProperty('--rx',(-b*10)+'deg')});w.addEventListener('mouseleave',function(){px.style.setProperty('--ry','0deg');px.style.setProperty('--rx','0deg')});})();
