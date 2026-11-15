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
        await login('f')
        await pg.evaluate("window.__pf.go('dme')");await pg.wait_for_timeout(150)
        await pg.fill('#pw0','bad');await pg.fill('#pw1','abc12345');await pg.fill('#pw2','abc12345');await pg.click('[data-a=pwchg]')
        print('msg1',await pg.inner_text('#pwm'))
        await pg.fill('#pw0','Madar@2026');await pg.click('[data-a=pwchg]');print('ok pw')
        await pg.evaluate("window.__pf.go('dcli')");await pg.wait_for_timeout(150);await pg.screenshot(path='/tmp/d3_cli.png')
        await pg.click('[data-a=dclo][data-k="شركة البناء الحديث"]');await pg.wait_for_timeout(200)
        await pg.fill('#cn1','أغلقت معه ديل الوكيل الصوتي، يبون العرض الأحد');await pg.select_option('#cn2','s');await pg.click('[data-a=cnadd]');await pg.wait_for_timeout(200)
        await pg.screenshot(path='/tmp/d3_det.png')
        await pg.click('[data-a=logout]')
        # old password fails, new works
        await pg.click('[data-a=devlogin]');await pg.fill('#de','faisal@madar.software');await pg.fill('#dp','Madar@2026');await pg.click('#df button[type=submit]');await pg.wait_for_timeout(200)
        print('old pw rejected','غير صحيحة' in await pg.inner_text('#app'))
        await pg.fill('#de','faisal@madar.software');await pg.fill('#dp','abc12345');await pg.click('#df button[type=submit]');await pg.wait_for_timeout(200)
        await pg.click('[data-a=logout]');await login('j')
        print(await pg.evaluate("[...document.querySelectorAll('#side .nv')].map(x=>x.innerText.replace(/\\n/g,'#'))"))
        await pg.evaluate("window.__pf.go('dchat')");await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/d3_chat.png')
        await pg.fill('#ch1','تمام فيصل، أجهز العرض');await pg.click('[data-a=chsend]');await pg.wait_for_timeout(200)
        print(errs);await b.close()
asyncio.run(main())
