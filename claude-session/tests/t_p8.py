from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1440,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:errs.append('C:'+m.text) if m.type=='error' and 'net::' not in m.text and 'Failed to load' not in m.text else None)
    pg.goto('file://../dist/madar-site.html#platform');pg.wait_for_timeout(700)
    pg.get_by_role('button',name='دخول',exact=True).click();pg.wait_for_timeout(900)
    def L(): return pg.evaluate("document.querySelector('#view').innerText.length")
    for v in ['home','inbox','assign','broadcast','emailtpl','meet','files','dash','skills','mcp','dev','tasks','time','agents']:
        pg.evaluate("v=>window.__pf.go(v)",v);pg.wait_for_timeout(200);print(v,L())
    pg.evaluate("window.__pf.go('agents')");pg.wait_for_timeout(200)
    pg.click('[data-a=agedit]');pg.wait_for_timeout(300)
    for k in ['id','per','kb','tools','mcp','sk','rep','adv']:
        pg.click('[data-a=agtab][data-k=%s]'%k);pg.wait_for_timeout(150);print('ag',k,L())
    pg.click('[data-a=agtab][data-k=tools]');pg.wait_for_timeout(150);pg.screenshot(path='/tmp/p8_agent.png')
    pg.evaluate("window.__pf.go('broadcast')");pg.wait_for_timeout(150)
    for k in ['cal','an','list']:
        pg.click('[data-a=bctab][data-k=%s]'%k);pg.wait_for_timeout(150);print('bc',k,L())
    pg.click('[data-a=bctab][data-k=cal]');pg.wait_for_timeout(150);pg.screenshot(path='/tmp/p8_cal.png')
    pg.evaluate("window.__pf.go('inbox')");pg.wait_for_timeout(200)
    pg.click('[data-a=iflt]');pg.wait_for_timeout(200);pg.screenshot(path='/tmp/p8_flt.png')
    pg.select_option('[data-ff=dept]','المبيعات');pg.click('[data-a=ifgo]');pg.wait_for_timeout(200)
    print('filtered list', pg.evaluate("document.querySelectorAll('.list > *').length"))
    pg.evaluate("window.__pf.go('assign')");pg.wait_for_timeout(200);pg.screenshot(path='/tmp/p8_asg.png',full_page=True)
    pg.evaluate("window.__pf.go('dev')");pg.wait_for_timeout(150)
    for k in ['hooks','mcp','gql','apps','oauth']:
        pg.click('[data-a=dvtab][data-k=%s]'%k);pg.wait_for_timeout(150);print('dev',k,L())
        if k=='gql': pg.click('[data-a=gqrun]');pg.wait_for_timeout(100)
    pg.evaluate("window.__pf.go('time')");pg.wait_for_timeout(150);pg.click('[data-a=tctab][data-k=cfg]');pg.wait_for_timeout(150);print('tc cfg',L())
    pg.click('[data-a=tctab][data-k=rep]');pg.wait_for_timeout(150);print('tc rep',L())
    pg.evaluate("window.__pf.go('tasks')");pg.wait_for_timeout(150);pg.click('[data-a=tkm][data-k=board]');pg.wait_for_timeout(150);print('board',L())
    print('ERR',errs)
