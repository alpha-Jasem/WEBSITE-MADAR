import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m:errs.append('C:'+m.text) if m.type=='error' else None)
        await pg.goto('file://../dist/madar-site.html');await pg.wait_for_timeout(600)
        await pg.evaluate("document.getElementById('book').scrollIntoView()");await pg.wait_for_timeout(600)
        await pg.click('#days button >> nth=0');await pg.wait_for_timeout(200)
        print('slots',await pg.evaluate("[...document.querySelectorAll('#slots button')].map(b=>b.dataset.t+(b.disabled?'x':'')).join(' ')"))
        await pg.evaluate("window.__av=1")
        await pg.click('#slots button >> nth=0');await pg.fill('#bn','عميل تجريبي');await pg.fill('#bc','شركة الاختبار');await pg.fill('#bp','0555555555')
        await pg.click('#bsub');await pg.wait_for_timeout(300)
        print('done visible',await pg.evaluate("!document.getElementById('done').hidden"))
        await pg.goto('file://../dist/madar-site.html#platform')
        errs2=[]
        await b.close()
        print(errs)
asyncio.run(main())
