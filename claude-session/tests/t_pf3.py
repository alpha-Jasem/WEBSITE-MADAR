import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':390,'height':800})
        errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://../dist/madar-site.html#platform')
        await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/m_login.png')
        await pg.click('#lf button[type=submit]'); await pg.wait_for_timeout(300)
        for v in ['home','inbox','agents','billing']:
            await pg.evaluate("v=>window.__pf.go(v)",v); await pg.wait_for_timeout(150)
            await pg.screenshot(path=f'/tmp/m_{v}.png')
        print(errs)
        # site smoke
        pg2=await b.new_page(viewport={'width':1440,'height':900})
        pg2.on('pageerror',lambda e:errs.append(str(e)))
        await pg2.goto('file://../dist/madar-site.html'); await pg2.wait_for_timeout(800)
        await pg2.click('[data-go=demo]'); await pg2.wait_for_timeout(500)
        print('demo enters shell', await pg2.evaluate("!!document.querySelector('.app')"), await pg2.evaluate("document.body.classList.contains('pf')"))
        await pg2.click('[data-a=logout]'); await pg2.click('[data-site]'); await pg2.wait_for_timeout(300)
        print('back to site', await pg2.evaluate("document.body.classList.contains('pf')"), errs)
        await b.close()
asyncio.run(main())
