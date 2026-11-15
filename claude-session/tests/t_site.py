import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1366,'height':800})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
        await pg.goto('file://../output/madar-site.html');await pg.wait_for_timeout(800)
        await pg.mouse.move(600,400);await pg.wait_for_timeout(300);await pg.mouse.move(700,420);await pg.wait_for_timeout(400)
        await pg.screenshot(path='/tmp/s_cursor.png')
        top=await pg.evaluate("document.getElementById('map').offsetTop");H=await pg.evaluate("document.getElementById('map').offsetHeight")
        for i,f in [(1,.1),(3,.7)]:
            await pg.evaluate(f"window.scrollTo(0,{top+(H-800)*f})");await pg.wait_for_timeout(3500);await pg.screenshot(path=f'/tmp/s_map{i}.png')
        await pg.evaluate("document.getElementById('agents').scrollIntoView()");await pg.wait_for_timeout(6000);await pg.screenshot(path='/tmp/s_phone.png')
        await pg.evaluate("document.getElementById('trust').scrollIntoView()");await pg.wait_for_timeout(800);await pg.screenshot(path='/tmp/s_trust.png')
        print(errs,await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]"))
        await b.close()
asyncio.run(main())
