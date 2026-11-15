import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900})
        errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m:errs.append('C:'+m.text) if m.type=='error' else None)
        await pg.goto('file://../dist/madar-site.html#platform')
        await pg.wait_for_timeout(600)
        await pg.screenshot(path='/tmp/pf_login.png')
        await pg.click('.gbtn'); await pg.wait_for_timeout(200)
        await pg.click('[data-a=gdone]'); await pg.wait_for_timeout(400)
        views=['home','inbox','team','contacts','broadcast','auto','agents','channels','kb','tasks','orders','reports','meta','billing','dev','settings','quick','assign','wam']
        for v in views:
            await pg.evaluate("v=>window.__pf.go(v)",v)
            await pg.wait_for_timeout(120)
            n=await pg.evaluate("document.querySelector('#view').innerText.length")
            print(v,n)
            if v in('inbox','home','billing','wam','channels'): await pg.screenshot(path=f'/tmp/pf_{v}.png')
        print('ERR',errs)
        await b.close()
asyncio.run(main())
