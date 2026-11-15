from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1440,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto('file://../output/madar-site.html#platform');pg.wait_for_timeout(500)
    pg.click('.gbtn');pg.wait_for_timeout(200);pg.click('[data-a=gdone]');pg.wait_for_timeout(300)
    pg.evaluate("window.__pf.go('dhome')") if False else None
    pg.click('.gbtn') if False else None
    # dev login
    pg.evaluate("sessionStorage.setItem('madar-pf','dev:f')");pg.reload();pg.wait_for_timeout(600)
    pg.evaluate("window.__pf.go('quotes')");pg.wait_for_timeout(300)
    pg.click('[data-a=qsend]');print('t1',pg.inner_text('.toast,#toast') if pg.query_selector('.toast,#toast') else '')
    pg.fill('[data-q=client]','شركة النور');pg.fill('[data-q=contact]','خالد')
    print('msg',pg.input_value('#qmsg')[:60])
    pg.fill('[data-q=email]','bad');pg.click('[data-a=qsend]');pg.wait_for_timeout(200)
    pg.fill('[data-q=email]','info@alnoor.com');pg.fill('#qmsg','رسالة معدلة');pg.fill('[data-q=client]','شركة النور 2')
    print('kept',pg.input_value('#qmsg'))
    pg.click('[data-a=qsend]');pg.wait_for_timeout(300);pg.screenshot(path='/tmp/q_send.png')
    print(pg.evaluate("document.body.innerText.includes('أُرسل إلى info@alnoor.com من faisal@madar.software')"))
    print('ERR',errs)
