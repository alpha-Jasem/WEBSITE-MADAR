from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1366,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto('file://../dist/madar-site.html');pg.wait_for_timeout(800)
    pg.evaluate("document.getElementById('tour').scrollIntoView()");pg.wait_for_timeout(2500)
    fr=pg.frame_locator('#dfr')
    print(fr.locator('.app').count(), fr.locator('.nv').count())
    pg.screenshot(path='/tmp/i1.png')
    pg.click('#dtype [data-v=agents]');pg.wait_for_timeout(800);pg.screenshot(path='/tmp/i2.png')
    pg.click('#dtype [data-v=inbox]');pg.wait_for_timeout(800)
    pg.evaluate("document.getElementById('brain').scrollIntoView()");pg.wait_for_timeout(600);pg.screenshot(path='/tmp/i3.png')
    pg.evaluate("scrollTo(0,document.body.scrollHeight)");pg.wait_for_timeout(600);pg.screenshot(path='/tmp/i4.png')
    pg.evaluate("document.getElementById('mobile').scrollIntoView()");pg.wait_for_timeout(600);pg.screenshot(path='/tmp/i5.png')
    print('ERR',errs)
