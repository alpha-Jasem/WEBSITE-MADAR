from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_page(viewport={'width':1366,'height':800});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto('file://../dist/madar-site.html');pg.wait_for_timeout(1500)
    pg.screenshot(path='/tmp/s_hero.png')
    pg.evaluate("document.getElementById('voice').scrollIntoView()");pg.wait_for_timeout(800)
    pg.click('#vplay');pg.wait_for_timeout(2500)
    print('audio',pg.evaluate("[vaud.readyState,vaud.paused,vaud.duration,vaud.currentTime,vaud.error&&vaud.error.code]"))
    pg.screenshot(path='/tmp/s_voice.png')
    pg.evaluate("document.getElementById('tour').scrollIntoView()");pg.wait_for_timeout(800)
    pg.click('.tb[data-i="2"]');pg.wait_for_timeout(700);pg.screenshot(path='/tmp/s_tour.png')
    pg.set_viewport_size({'width':390,'height':800});pg.wait_for_timeout(500)
    pg.evaluate("scrollTo(0,0)");pg.wait_for_timeout(500);pg.screenshot(path='/tmp/s_hero_m.png')
    pg.evaluate("document.getElementById('voice').scrollIntoView()");pg.wait_for_timeout(500);pg.screenshot(path='/tmp/s_voice_m.png')
    pg.evaluate("document.getElementById('tour').scrollIntoView()");pg.wait_for_timeout(500);pg.screenshot(path='/tmp/s_tour_m.png')
    print('ERR',errs)
