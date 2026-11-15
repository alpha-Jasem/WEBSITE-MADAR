import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':390,'height':800})
        await pg.goto('file://../dist/madar-site.html#platform'); await pg.wait_for_timeout(300)
        await pg.click('#lf button[type=submit]'); await pg.evaluate("window.__pf.go('inbox')")
        await pg.click('.ci'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='/tmp/m_thread.png')
        await b.close()
asyncio.run(main())
