import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900})
        errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://../dist/madar-site.html#platform')
        await pg.wait_for_timeout(400)
        await pg.click('#lf button[type=submit]'); await pg.wait_for_timeout(300)
        await pg.evaluate("window.__pf.go('inbox')")
        st=lambda: pg.evaluate("window.__pf.CV.map(c=>c.id+':'+c.st+':'+c.tags.length).join(' ')")
        await pg.click('[data-a=stmenu]'); await pg.click('.pop [data-k=bot]'); await pg.wait_for_timeout(150)
        print('bot',await st())
        await pg.click('[data-a=cflt][data-k=bot]'); await pg.wait_for_timeout(100)
        print('cur',await pg.evaluate("window.__pf.S.ci"))
        # tags
        await pg.evaluate("window.__pf.S.ci=2;window.__pf.render()")
        await pg.click('.cr [data-a=tags]'); await pg.click('.pop [data-k="شكوى"]'); await pg.wait_for_timeout(100)
        print('tags',await st())
        await pg.keyboard.press('Escape')
        await pg.mouse.click(10,400)
        # 24h window conv 5 (snoozed, wa age 3000)
        await pg.click('[data-a=cflt][data-k=snoozed]'); await pg.wait_for_timeout(100)
        dis=await pg.evaluate("document.querySelector('#cta').disabled")
        print('window closed disabled',dis, await pg.evaluate("!!document.querySelector('.warn24')"))
        await pg.click('.warn24 [data-a=tpl]'); await pg.wait_for_timeout(200)
        await pg.fill('.mdl [data-v="0"]','عبدالله') if await pg.query_selector('.mdl [data-v="0"]') else None
        await pg.screenshot(path='/tmp/pf_tpl.png')
        # choose a no-var template
        await pg.click('.mdl [data-a=tpick][data-i="2"]'); await pg.wait_for_timeout(100)
        for i in range(3):
            el=await pg.query_selector(f'.mdl [data-v="{i}"]')
            if el: await el.fill('x'+str(i))
        await pg.click('.mdl [data-a=tsend]'); await pg.wait_for_timeout(200)
        print('after tpl',await st(), await pg.evaluate("document.querySelector('#cta').disabled"))
        # builder
        await pg.evaluate("window.__pf.go('wam');window.__pf.S.tabs.wam='templates';window.__pf.render()")
        await pg.click('[data-a=tnew]'); await pg.wait_for_timeout(200)
        await pg.fill('[data-f=n]','Bad Name!')
        await pg.fill('[data-f=b]','{{1}} hello {{3}}')
        await pg.wait_for_timeout(150)
        print('bad checks',await pg.evaluate("document.querySelectorAll('#tbc .chk.no').length"))
        await pg.screenshot(path='/tmp/pf_builder.png')
        await pg.fill('[data-f=n]','order_ready')
        await pg.fill('[data-f=b]','هلا {{1}}، طلبك رقم {{2}} جاهز للاستلام.')
        await pg.wait_for_timeout(150)
        for i in range(2):
            el=await pg.query_selector(f'[data-ex="{i}"]')
            await el.fill('سارة' if i==0 else '5521')
        await pg.wait_for_timeout(150)
        print('good checks',await pg.evaluate("document.querySelectorAll('#tbc .chk.no').length"))
        await pg.click('[data-t=submit]'); await pg.wait_for_timeout(300)
        print('tpl count',await pg.evaluate("window.__pf.TPL.length"))
        # channels menu
        await pg.evaluate("window.__pf.go('channels')")
        await pg.click('[data-a=chmenu]'); await pg.wait_for_timeout(100)
        print('menu items',await pg.evaluate("document.querySelectorAll('.pop button').length"))
        await pg.mouse.click(10,400)
        # billing plan
        await pg.evaluate("window.__pf.go('billing')")
        await pg.click('[data-a=planpick][data-k=Business]'); await pg.click('[data-a=plango]'); await pg.wait_for_timeout(100)
        print('plan',await pg.evaluate("window.__pf.S.plan"))
        # agents test chat
        await pg.evaluate("window.__pf.go('agents')")
        await pg.click('[data-a=agedit][data-i="0"]'); await pg.fill('#agi','كم السعر'); await pg.click('[data-a=agsend]')
        print('agent reply',await pg.evaluate("document.querySelector('#agm').innerText.slice(-60)"))
        # campaign wizard
        await pg.evaluate("window.__pf.go('broadcast')")
        await pg.click('[data-a=wnew]'); await pg.fill('#w1','حملة'); 
        for _ in range(3): await pg.click('[data-w=n]')
        print('wizard review',await pg.evaluate("document.querySelector('.mdl .bx').innerText.length"))
        await pg.click('[data-w=go]'); await pg.wait_for_timeout(100)
        # ticket
        await pg.evaluate("window.__pf.CV[1].st='open';window.__pf.S.ci=2;window.__pf.S.cflt='open';window.__pf.go('inbox')")
        await pg.click('[data-a=tomenu]'); await pg.click('.pop [data-a=ticket]'); await pg.click('[data-a=tkgo]'); await pg.wait_for_timeout(100)
        print('tickets',await pg.evaluate("document.querySelectorAll('.sys').length"))
        # keyboard shortcut Alt+E
        await pg.keyboard.press('Alt+e'); await pg.wait_for_timeout(100)
        print('alt e',await st())
        # login-out
        await pg.evaluate("window.__pf.go('settings')")
        for t in ['team','dep','perm','tags','fld','not','sec','log']:
            await pg.click(f'[data-a=stab][data-k={t}]')
        # mobile
        await pg.set_viewport_size({'width':390,'height':800})
        for v in ['home','inbox','billing','wam','channels','settings','contacts','agents']:
            await pg.evaluate("v=>window.__pf.go(v)",v); await pg.wait_for_timeout(100)
            ov=await pg.evaluate("document.documentElement.scrollWidth-innerWidth")
            print('mobile',v,ov)
        await pg.screenshot(path='/tmp/pf_mob.png')
        print('ERR',errs)
        await b.close()
asyncio.run(main())
