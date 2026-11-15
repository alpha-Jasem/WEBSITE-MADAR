import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900})
        errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m:errs.append('C:'+m.text) if m.type=='error' else None)
        await pg.goto('file://../dist/madar-site.html#platform')
        await pg.wait_for_timeout(500)
        await pg.click('.gbtn'); await pg.wait_for_timeout(200)
        await pg.click('[data-a=gdone]'); await pg.wait_for_timeout(300)
        await pg.evaluate("window.__pf.go('quotes')"); await pg.wait_for_timeout(300)
        await pg.fill('[data-q=client]','شركة النور للحديد')
        await pg.screenshot(path='/tmp/q_view.png')
        await pg.evaluate("""()=>{var Q=window.__pf.Q;Q.client='شركة النور للحديد';Q.contact='أ. خالد العتيبي';Q.phone='+966 55 123 4567';Q.lines=[{s:6,d:'تصميم وتطوير موقع إلكتروني',q:1,p:'18000',per:'once'},{s:17,d:'تصميم نموذج عرض سعر بهوية شركتك',q:1,p:'1000',per:'once'},{s:12,d:'تشغيل الشات بوت',q:1,p:'799',per:'month'},{s:13,d:'صيانة جزئية',q:1,p:'299',per:'month'}]}""")
        for t in ('classic','dark','mini'):
            await pg.evaluate("t=>{window.__pf.Q.tpl=t;var d=document.createElement('div');d.id='qprint';d.innerHTML=window.__pf.qHTML();document.body.appendChild(d);document.body.classList.add('qprn')}",t)
            await pg.emulate_media(media='print')
            await pg.pdf(path=f'/tmp/Madar-Quotation-{t}.pdf',prefer_css_page_size=True,print_background=True)
            await pg.evaluate("document.getElementById('qprint').remove();document.body.classList.remove('qprn')")
            await pg.emulate_media(media='screen')
        await pg.evaluate("window.__pf.go('billing')");await pg.wait_for_timeout(200)
        await pg.click('[data-k=metac]');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/q_metac.png')
        await pg.evaluate("window.__pf.go('broadcast')");await pg.wait_for_timeout(200)
        print('ERR',errs)
        await b.close()
asyncio.run(main())
