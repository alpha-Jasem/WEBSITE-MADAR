from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1366,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto('file://../output/madar-site.html');pg.wait_for_timeout(800)
    pg.evaluate("document.getElementById('tour').scrollIntoView()");pg.wait_for_timeout(500)
    pg.click('[data-d=sim]');pg.wait_for_timeout(2000)
    pg.click('[data-d=take]');pg.wait_for_timeout(200)
    pg.fill('#dinp','هلا سلمان، أبشر');pg.press('#dinp','Enter');pg.wait_for_timeout(1800)
    pg.screenshot(path='/tmp/d1.png')
    pg.click('[data-d=back]');pg.wait_for_timeout(300)
    pg.click('[data-v=agents]');pg.wait_for_timeout(200)
    print(pg.evaluate("document.getElementById('dguide').innerText.slice(0,200)"))
    pg.click('[data-d=type][data-i="2"]');pg.wait_for_timeout(300);pg.click('[data-d=sim]');pg.wait_for_timeout(1800);pg.screenshot(path='/tmp/d2.png')
    pg.click('#slang');pg.wait_for_timeout(500);print(pg.evaluate("document.getElementById('dguide').innerText.slice(0,120)"))
    pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(400);pg.evaluate("document.getElementById('dwin').scrollIntoView()");pg.screenshot(path='/tmp/d3.png')
    print('ERR',errs)
