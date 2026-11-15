from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1440,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:errs.append('C:'+m.text) if m.type=='error' else None)
    pg.goto('file://../output/madar-site.html#platform');pg.wait_for_timeout(600)
    pg.get_by_role('button',name='دخول',exact=True).click();pg.wait_for_timeout(900)
    for v in ['time','popups','trig','settings']:
        pg.evaluate("v=>window.__pf.go(v)",v);pg.wait_for_timeout(250)
        if v=='settings':
            for k in ['perm','not','sec','leads','prod','apps','log']:
                pg.evaluate("k=>document.querySelector('[data-a=stab][data-k='+k+']').click()",k);pg.wait_for_timeout(200)
                print(k,pg.evaluate("document.querySelector('#view').innerText.length"))
        else: print(v,pg.evaluate("document.querySelector('#view').innerText.length"))
    pg.evaluate("window.__pf.go('time')");pg.wait_for_timeout(200);pg.click('[data-a=tcpunch]');pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/gap1.png')
    pg.evaluate("window.__pf.go('trig')");pg.wait_for_timeout(200);pg.screenshot(path='/tmp/gap2.png')
    print('ERR',errs)
