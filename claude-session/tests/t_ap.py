from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1366,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto('file://../dist/madar-site.html');pg.wait_for_timeout(800)
    pg.evaluate("document.getElementById('apps').scrollIntoView()");pg.wait_for_timeout(900);pg.screenshot(path='/tmp/ap1.png')
    pg.evaluate("scrollTo(0,document.body.scrollHeight)");pg.wait_for_timeout(700);pg.screenshot(path='/tmp/ap2.png')
    pg.click('#slang');pg.wait_for_timeout(500);print(pg.evaluate("document.querySelector('#apps h2').innerText+' | '+document.querySelector('.ftapps b').innerText"))
    print('ERR',errs)
