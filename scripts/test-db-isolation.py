"""
Database isolation and safety checks for the linked Supabase project (read/rollback only).
Run:  python scripts/test-db-isolation.py
Every statement runs inside BEGIN ... ROLLBACK, so nothing is changed. Needs `npx supabase` logged in and linked.
Roles are simulated with SET LOCAL ROLE plus request.jwt.claims.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def query(sql: str) -> str:
    with tempfile.NamedTemporaryFile('w', suffix='.sql', delete=False, encoding='utf-8') as f:
        f.write(sql)
        path = f.name
    r = subprocess.run(f'npx supabase db query --linked -f "{path}"', shell=True, capture_output=True, text=True, cwd=ROOT)
    os.unlink(path)
    return r.stdout + r.stderr


def rows(out: str):
    m = re.search(r'\{.*\}', out, re.S)
    try:
        return json.loads(m.group(0)).get('rows', []) if m else []
    except json.JSONDecodeError:
        return []


def first(sql: str):
    r = rows(query(sql))
    return list(r[0].values())[0] if r else None


admin_id = first("select id from public.users where role = 'admin' limit 1")
client_id = (first("select u.id from public.users u join public.companies c on c.auth_user_id = u.id where u.role = 'client' limit 1")
             or first("select id from public.users where role = 'client' limit 1"))
if not admin_id or not client_id:
    sys.exit('need one admin and one client user in public.users')

owned = first(f"select id from public.companies where auth_user_id = '{client_id}' limit 1")

failures = []


def claims(uid):
    return f"select set_config('request.jwt.claims','{{\"sub\":\"{uid}\",\"role\":\"authenticated\"}}',true);"


def check(label, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + label + (f'  [{detail}]' if detail and not ok else ''))
    if not ok:
        failures.append(label)


def count_as(role, uid, table):
    c = claims(uid) if uid else ''
    out = query(f'begin; set local role {role}; {c} select count(*) as n from public.{table}; rollback;')
    r = rows(out)
    return r[0]['n'] if r else ('denied' if 'permission denied' in out else out[:120])


def guarded_update(uid, sql_set):
    block = f"""begin; set local role authenticated; {claims(uid)}
do $$ declare n int; begin update public.companies set {sql_set} where id = '{owned}';
get diagnostics n = row_count; raise exception 'RESULT:rows=%', n;
exception when insufficient_privilege then raise exception 'RESULT:denied'; end $$; rollback;"""
    m = re.search(r'RESULT:([a-z0-9=]+)', query(block))
    return m.group(1) if m else 'unknown'


# 1. A signed-in client must not be able to make themselves admin.
out = query(f"begin; set local role authenticated; {claims(client_id)} update public.users set role = 'admin' where id = '{client_id}'; rollback;")
check('client cannot set own role to admin', 'permission denied' in out or 'violates' in out, out[:120])

# 2. Agency tables are invisible to clients and anon, visible to admin.
for table in ['sales_blitz_leads', 'crm_leads', 'outreach_leads', 'outreach_runs', 'deals', 'deal_events', 'do_not_contact', 'campaigns', 'agency_goals', 'audit_events', 'integration_checks']:
    c = count_as('authenticated', client_id, table)
    a = count_as('anon', None, table)
    check(f'{table}: client sees nothing', c in (0, 'denied'), str(c))
    check(f'{table}: anon sees nothing', a in (0, 'denied'), str(a))
    adm = count_as('authenticated', admin_id, table)
    check(f'{table}: admin can read', isinstance(adm, int), str(adm))

# 3. A tenant owner may edit profile fields but not billing or demo fields.
if owned:
    check('owner cannot change plan', guarded_update(client_id, "plan = 'enterprise'") == 'denied')
    check('owner cannot flip is_demo', guarded_update(client_id, 'is_demo = false') == 'denied')
    check('owner can edit own city', guarded_update(client_id, 'city = city') == 'rows=1')
else:
    print('SKIP company guard checks: the client user owns no company')

# 4. Do-not-contact blocks inserts at the database level, and phones normalise.
r = first("select public.normalize_sa_phone('0502677477')")
check('phone 0502677477 -> 966502677477', r == '966502677477', str(r))
check('invalid phone -> null', first("select public.normalize_sa_phone('12345') is null") is True)
blocked = first(f"""begin; set local role authenticated; {claims(admin_id)}
insert into public.do_not_contact (phone, reason) values ('966500000001', 'opt_out');
with ins as (insert into public.outreach_leads (name, phone) values ('x', '966500000001') returning id) select count(*) from ins; rollback;""")
check('blocked number cannot become a lead', blocked == 0, str(blocked))

print('\n' + ('ALL CHECKS PASSED' if not failures else f'{len(failures)} FAILED: ' + '; '.join(failures)))
sys.exit(1 if failures else 0)
