import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1366,'height':900})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://../output/madar-site.html');await pg.wait_for_timeout(800)
        for i in ('ecom','pricing'):
            await pg.evaluate("i=>{document.getElementById(i).scrollIntoView();window.scrollBy(0,2)}",i);await pg.wait_for_timeout(900)
            el=await pg.query_selector('#'+i);await el.screenshot(path=f'/tmp/s_{i}.png')
        await pg.click('#slang');await pg.wait_for_timeout(300)
        el=await pg.query_selector('#ecom');await el.screenshot(path='/tmp/s_ecom_en.png')
        print(errs);await b.close()
asyncio.run(main())
