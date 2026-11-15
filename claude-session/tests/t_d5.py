import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m:errs.append('C:'+m.text) if m.type=='error' else None)
        await pg.goto('file://../output/madar-site.html#platform');await pg.wait_for_timeout(500)
        async def login(k):
            await pg.click('[data-a=devlogin]');await pg.click(f'[data-a=devfill][data-k={k}]');await pg.click('#df button[type=submit]');await pg.wait_for_timeout(250)
        await login('j')
        await pg.evaluate("window.__pf.go('dav')");await pg.wait_for_timeout(200)
        for i in range(5): await pg.click('[data-a=avsw][data-k="%d"]'%i)   # jasim off all days
        await pg.screenshot(path='/tmp/d5_av.png')
        await pg.click('[data-a=logout]')
        await pg.evaluate("location.hash='#book'");await pg.wait_for_timeout(700)
        await pg.click('#days button >> nth=0');await pg.wait_for_timeout(200)
        print('slots',await pg.evaluate("[...document.querySelectorAll('#slots button')].map(b=>b.dataset.t+(b.disabled?'x':'')).join(' ')"))
        await pg.click('#slots button:not([disabled]) >> nth=0');await pg.fill('#bn','عميل تجريبي');await pg.fill('#bc','شركة الاختبار');await pg.fill('#bp','0555555555');await pg.click('#bsub');await pg.wait_for_timeout(300)
        await pg.evaluate("location.hash='#platform'");await pg.wait_for_timeout(500)
        await login('f')
        await pg.screenshot(path='/tmp/d5_home.png')
        await pg.evaluate("window.__pf.go('dav')");await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/d5_av_f.png')
        print(errs);await b.close()
asyncio.run(main())
