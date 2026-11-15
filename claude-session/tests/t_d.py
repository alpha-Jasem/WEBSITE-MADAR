import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.on('console',lambda m:errs.append('C:'+m.text) if m.type=='error' else None)
        await pg.goto('file://../dist/madar-site.html#platform');await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/d_login.png')
        await pg.click('[data-a=devlogin]');await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/d_home.png')
        nav=await pg.evaluate("[...document.querySelectorAll('#side .nv')].map(x=>x.innerText)");print(nav)
        # client: login, grant access
        await pg.click('[data-a=logout]');await pg.wait_for_timeout(200)
        await pg.click('.gbtn');await pg.click('[data-a=gdone]');await pg.wait_for_timeout(300)
        print([x for x in await pg.evaluate("[...document.querySelectorAll('#side .nv')].map(x=>x.innerText)")])
        await pg.evaluate("window.__pf.go('support')");await pg.wait_for_timeout(200)
        await pg.click('[data-a=supgrant]');await pg.wait_for_timeout(1300)
        await pg.screenshot(path='/tmp/d_support.png')
        await pg.click('[data-a=logout]');await pg.click('[data-a=devlogin]');await pg.wait_for_timeout(300)
        await pg.click('[data-a=impin][data-i="0"]');await pg.wait_for_timeout(300)
        await pg.screenshot(path='/tmp/d_imp.png')
        await pg.click('[data-a=impexit]');await pg.wait_for_timeout(300)
        await pg.evaluate("window.__pf.go('quotes')");await pg.wait_for_timeout(300)
        await pg.evaluate("window.__pf.go('dreq')");await pg.wait_for_timeout(200)
        print(errs);await b.close()
asyncio.run(main())
