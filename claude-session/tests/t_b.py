import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1366,'height':900})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://../output/madar-site.html');await pg.wait_for_timeout(800)
        for i in ('brain','mobile'):
            await pg.evaluate("i=>{document.getElementById(i).scrollIntoView();window.scrollBy(0,2)}",i);await pg.wait_for_timeout(900)
            if i=='brain': await pg.click('.bmd >> nth=0');await pg.wait_for_timeout(200)
            await (await pg.query_selector('#'+i)).screenshot(path=f'/tmp/b_{i}.png')
        await pg.evaluate("document.querySelector('footer').scrollIntoView()");await pg.wait_for_timeout(600)
        await (await pg.query_selector('footer')).screenshot(path='/tmp/b_foot.png')
        print('shopify' , 'Shopify' in await pg.content())
        await pg.goto('file://../output/madar-site.html#platform');await pg.wait_for_timeout(500)
        await pg.click('.gbtn');await pg.click('[data-a=gdone]');await pg.wait_for_timeout(300)
        await pg.evaluate("window.__pf.go('agents')");await pg.wait_for_timeout(200)
        await pg.click('[data-a=agedit] >> nth=0');await pg.wait_for_timeout(200)
        await pg.click('[data-a=brain][data-k=gpt]');await pg.wait_for_timeout(200)
        await pg.screenshot(path='/tmp/b_ag.png')
        await pg.evaluate("window.__pf.go('home')");await pg.wait_for_timeout(200)
        print('app card', 'Galaxy Store' in await pg.inner_text('#view'))
        print(errs);await b.close()
asyncio.run(main())
