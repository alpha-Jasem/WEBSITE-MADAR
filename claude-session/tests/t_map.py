import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for name,vw,vh in [('d',1366,800),('m',390,780)]:
            pg=await b.new_page(viewport={'width':vw,'height':vh})
            errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
            await pg.goto('file://../dist/madar-site.html');await pg.wait_for_timeout(800)
            top=await pg.evaluate("document.getElementById('map').offsetTop");H=await pg.evaluate("document.getElementById('map').offsetHeight")
            for i in range(5):
                y=top+(H-vh)*(i+.5)/5
                await pg.evaluate(f"window.scrollTo(0,{y})");await pg.wait_for_timeout(1800)
                await pg.screenshot(path=f'/tmp/map_{name}{i}.png')
            sw=await pg.evaluate("[document.documentElement.scrollWidth,innerWidth]")
            print(name,errs,sw)
            if name=='d':
                await pg.evaluate("document.getElementById('slang').click()");await pg.evaluate(f"window.scrollTo(0,{top+(H-vh)*.7})");await pg.wait_for_timeout(1500);await pg.screenshot(path='/tmp/map_en.png')
        await b.close()
asyncio.run(main())
