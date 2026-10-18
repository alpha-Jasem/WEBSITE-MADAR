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
for table in ['sales_blitz_leads', 'crm_leads', 'outreach_leads', 'outreach_runs', 'deals', 'deal_events', 'do_not_contact', 'campaigns', 'agency_goals', 'audit_events', 'integration_checks', 'payments', 'admin_tasks', 'agency_settings', 'agency_services', 'packages', 'package_prices', 'quotes', 'contracts', 'invoices', 'refunds', 'expenses', 'bank_notifications', 'news_sources', 'news_items', 'backup_runs', 'onboarding_projects', 'onboarding_items', 'sales_agents', 'agent_assignments', 'agent_drafts', 'marketers', 'referrals', 'commissions', 'payout_statements']:
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

# 5. The collection ledger refuses inconsistent rows and double-recorded references (all rolled back).
def as_admin(sql):
    return query(f"begin; set local role authenticated; {claims(admin_id)} {sql} rollback;")


bad_sum = as_admin("insert into public.payments (customer_name, total_amount, net_amount, tax_amount) values ('t', 1000, 800, 100);")
check('payment whose net + tax != total is rejected', 'payments_amounts_add_up' in bad_sum, bad_sum[:120])
no_actor = as_admin("insert into public.payments (customer_name, total_amount, net_amount, tax_amount, status) values ('t', 1150, 1000, 150, 'confirmed');")
check('payment cannot be inserted confirmed without a confirming actor', 'payments_confirmed_has_actor' in no_actor, no_actor[:120])
dup = as_admin("insert into public.payments (customer_name, total_amount, net_amount, tax_amount, reference) values ('t', 1150, 1000, 150, 'R1'); "
               "insert into public.payments (customer_name, total_amount, net_amount, tax_amount, reference) values ('t', 1150, 1000, 150, 'R1');")
check('same bank reference cannot be recorded twice', 'payments_reference_key' in dup, dup[:120])
client_ins = query(f"begin; set local role authenticated; {claims(client_id)} insert into public.payments (customer_name, total_amount, net_amount, tax_amount) values ('t', 1150, 1000, 150); rollback;")
check('a client cannot write payments', 'row-level security' in client_ins or 'permission denied' in client_ins, client_ins[:120])

# 6. Commercial rules (all rolled back): frozen approved data, refund cap, go-live gates, agent send limits, marketers.
A = admin_id
QUOTE = "insert into public.quotes (id, customer_name, net_total, tax_total, grand_total, status, snapshot, approved_by) values ('00000000-0000-0000-0000-0000000000a1', 'q', 1000, 150, 1150, 'approved', '{}', '%s');" % A
out = as_admin(QUOTE + " update public.quotes set grand_total = 1, net_total = 1, tax_total = 0 where id = '00000000-0000-0000-0000-0000000000a1';")
check('approved quote cannot change its amounts', 'approved_quote_is_frozen' in out, out[:120])
out = as_admin("insert into public.quotes (customer_name, net_total, tax_total, grand_total, status) values ('q', 1, 0, 1, 'sent');")
check('a quote cannot leave draft without snapshot and approver', 'quotes_approved_has_snapshot' in out, out[:120])
out = as_admin("insert into public.package_prices (id, package_id, version, setup_net, status, approved_by, approved_at) select '00000000-0000-0000-0000-0000000000b1', id, 99, 100, 'approved', '%s', now() from public.packages limit 1; update public.package_prices set setup_net = 5 where id = '00000000-0000-0000-0000-0000000000b1';" % A)
check('approved package price is frozen', 'approved_price_is_frozen' in out, out[:120])
CONTRACT = QUOTE + " insert into public.contracts (id, quote_id, customer_name, terms) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'q', '{\"a\":1}');"
out = as_admin(CONTRACT + " update public.contracts set terms = '{\"a\":2}' where id = '00000000-0000-0000-0000-0000000000c1';")
check('contract terms are frozen after creation', 'contract_terms_are_frozen' in out, out[:120])
INV = "insert into public.invoices (id, customer_name, net_total, tax_total, grand_total) values ('00000000-0000-0000-0000-0000000000d1', 'q', 1000, 150, 1150);"
out = as_admin(INV + " update public.invoices set grand_total = 5, net_total = 5, tax_total = 0 where id = '00000000-0000-0000-0000-0000000000d1';")
check('issued invoice amounts are frozen', 'invoice_amounts_are_frozen' in out, out[:120])

PAY = ("insert into public.payments (id, customer_name, total_amount, net_amount, tax_amount, status, confirmed_at, confirmed_by) "
       "values ('00000000-0000-0000-0000-0000000000e1', 'p', 1150, 1000, 150, 'confirmed', now(), '%s');" % A)
out = as_admin(PAY + " insert into public.refunds (payment_id, amount) values ('00000000-0000-0000-0000-0000000000e1', 2000);")
check('refund larger than the payment is rejected', 'refund_exceeds_payment' in out, out[:120])
out = as_admin("insert into public.payments (id, customer_name, total_amount, net_amount, tax_amount) values ('00000000-0000-0000-0000-0000000000e2', 'p', 100, 87, 13); insert into public.refunds (payment_id, amount) values ('00000000-0000-0000-0000-0000000000e2', 50);")
check('refund needs a confirmed payment', 'refund_needs_confirmed_payment' in out, out[:120])
out = as_admin(PAY + " insert into public.refunds (id, payment_id, amount, status, approved_by, approved_at) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 1000, 'approved', '%s', now()); insert into public.refunds (payment_id, amount, status, approved_by, approved_at) values ('00000000-0000-0000-0000-0000000000e1', 500, 'approved', '%s', now());" % (A, A))
check('approved refunds together cannot exceed the payment', 'refund_exceeds_payment' in out, out[:120])

PROJ = "insert into public.onboarding_projects (id, customer_name) values ('00000000-0000-0000-0000-000000000a11', 'x');"
out = as_admin(PROJ + " update public.onboarding_projects set status = 'live' where id = '00000000-0000-0000-0000-000000000a11';")
check('a project without gates cannot go live', 'go_live_requires_gates' in out, out[:120])
out = as_admin(PROJ + " insert into public.onboarding_items (project_id, title, kind) values ('00000000-0000-0000-0000-000000000a11', 'tests', 'gate'); update public.onboarding_projects set status = 'live' where id = '00000000-0000-0000-0000-000000000a11';")
check('an open gate blocks going live', 'go_live_blocked_by_open_gates' in out, out[:120])
out = as_admin(PROJ + " insert into public.onboarding_items (project_id, title, kind, status) values ('00000000-0000-0000-0000-000000000a11', 'tests', 'gate', 'done'); update public.onboarding_projects set status = 'live' where id = '00000000-0000-0000-0000-000000000a11' returning status;")
check('all gates done allows going live', "'live'" in out or '"live"' in out, out[:160])

AG = "insert into public.sales_agents (id, name, status, daily_message_cap) values ('00000000-0000-0000-0000-000000000b11', 'a', 'active', 1);"
LEAD = "insert into public.outreach_leads (id, name, phone) values ('00000000-0000-0000-0000-000000000c11', 'L', '966500000777'), ('00000000-0000-0000-0000-000000000c12', 'L2', '966500000778');"
D1 = "insert into public.agent_drafts (id, agent_id, lead_id, body) values ('00000000-0000-0000-0000-000000000d11', '00000000-0000-0000-0000-000000000b11', '00000000-0000-0000-0000-000000000c11', 'hi');"
D2 = "insert into public.agent_drafts (id, agent_id, lead_id, body) values ('00000000-0000-0000-0000-000000000d12', '00000000-0000-0000-0000-000000000b11', '00000000-0000-0000-0000-000000000c12', 'hi');"
out = as_admin(AG + LEAD + D1 + D2 + " update public.agent_drafts set status = 'sent' where id = '00000000-0000-0000-0000-000000000d11'; update public.agent_drafts set status = 'sent' where id = '00000000-0000-0000-0000-000000000d12';")
check('agent cannot send past its daily cap', 'daily_cap_reached' in out, out[:120])
out = as_admin(AG.replace("'active'", "'paused'") + LEAD + D1 + " update public.agent_drafts set status = 'sent' where id = '00000000-0000-0000-0000-000000000d11';")
check('a paused agent cannot send', 'agent_not_active' in out, out[:120])
out = as_admin(AG + LEAD + "insert into public.do_not_contact (phone, reason) values ('966500000777', 'opt_out');" + D1 + " update public.agent_drafts set status = 'sent' where id = '00000000-0000-0000-0000-000000000d11';")
check('do-not-contact blocks an agent send', 'do_not_contact' in out, out[:120])
out = as_admin(AG + LEAD + "insert into public.deals (id, company_name, owner_type) values ('00000000-0000-0000-0000-000000000e11', 'L', 'owner'); insert into public.agent_drafts (agent_id, lead_id, deal_id, body) values ('00000000-0000-0000-0000-000000000b11', '00000000-0000-0000-0000-000000000c11', '00000000-0000-0000-0000-000000000e11', 'hi') returning id;"
               " update public.agent_drafts set status = 'sent' where deal_id = '00000000-0000-0000-0000-000000000e11';")
check('owner-held deal stops the agent', 'owner_has_the_deal' in out, out[:120])
out = as_admin(AG + LEAD + "insert into public.sales_agents (id, name) values ('00000000-0000-0000-0000-000000000b12', 'b'); insert into public.agent_assignments (agent_id, lead_id) values ('00000000-0000-0000-0000-000000000b11', '00000000-0000-0000-0000-000000000c11'); insert into public.agent_assignments (agent_id, lead_id) values ('00000000-0000-0000-0000-000000000b12', '00000000-0000-0000-0000-000000000c11');")
check('two agents cannot own the same company', 'agent_assignments_one_active' in out, out[:120])

MK = ("insert into public.marketers (id, auth_user_id, name) values ('00000000-0000-0000-0000-000000000f11', '%s', 'mine'), ('00000000-0000-0000-0000-000000000f12', null, 'other'); "
      "insert into public.referrals (marketer_id, company_name, contact_phone) values ('00000000-0000-0000-0000-000000000f11', 'mine co', '966500000001'), ('00000000-0000-0000-0000-000000000f12', 'other co', '966500000002');" % client_id)
seen = rows(query(f"begin; set local role authenticated; {claims(admin_id)} {MK} {claims(client_id)} select (select count(*) from public.referrals) as refs, (select count(*) from public.marketers) as ms, (select count(*) from public.outreach_leads) as leads, (select count(*) from public.companies where auth_user_id <> '{client_id}') as others; rollback;"))
check('a marketer sees only their own referral and no leads', bool(seen) and seen[0]['refs'] == 1 and seen[0]['ms'] == 1 and seen[0]['leads'] == 0, str(seen))
out = as_admin("insert into public.marketers (id, name) values ('00000000-0000-0000-0000-000000000f21', 'a'), ('00000000-0000-0000-0000-000000000f22', 'b'); insert into public.referrals (marketer_id, company_name, contact_phone, status) values ('00000000-0000-0000-0000-000000000f21', 'c', '966500000009', 'accepted'); insert into public.referrals (marketer_id, company_name, contact_phone, status) values ('00000000-0000-0000-0000-000000000f22', 'c', '966500000009', 'accepted');")
check('the same company cannot be accepted for two marketers', 'referrals_one_accepted_per_phone' in out, out[:120])

# 7. Happy path, same statements the dashboard runs: quote -> approve -> accept -> contract -> invoice -> payment -> confirm -> refund.
Q, C, I, PY, RF = ('00000000-0000-0000-0000-00000000%04d' % n for n in (1, 2, 3, 4, 5))
flow = f"""
insert into public.quotes (id, customer_name, setup_net, monthly_net, vat_rate, net_total, tax_total, grand_total) values ('{Q}', 'flow', 4000, 1000, 15, 5000, 750, 5750);
update public.quotes set status = 'approved', approved_by = '{A}', approved_at = now(), snapshot = '{{"grand_total":5750}}' where id = '{Q}';
update public.quotes set status = 'accepted', accepted_at = now() where id = '{Q}';
insert into public.contracts (id, quote_id, customer_name, terms) values ('{C}', '{Q}', 'flow', '{{"grand_total":5750}}');
insert into public.invoices (id, quote_id, contract_id, customer_name, net_total, tax_total, grand_total) values ('{I}', '{Q}', '{C}', 'flow', 5000, 750, 5750);
insert into public.payments (id, invoice_id, customer_name, total_amount, net_amount, tax_amount, reference) values ('{PY}', '{I}', 'flow', 3000, 2608.7, 391.3, 'FLOW-1');
update public.payments set status = 'confirmed', confirmed_at = now(), confirmed_by = '{A}' where id = '{PY}';
insert into public.refunds (id, payment_id, invoice_id, amount, status, approved_by, approved_at, executed_by, executed_at, reference) values ('{RF}', '{PY}', '{I}', 500, 'executed', '{A}', now(), '{A}', now(), 'RF-1');
select grand_total, paid, refunded from public.invoice_balances where invoice_id = '{I}';
"""
res = rows(query(f"begin; set local role authenticated; {claims(admin_id)} {flow} rollback;"))
ok = bool(res) and float(res[0]['grand_total']) == 5750 and float(res[0]['paid']) == 3000 and float(res[0]['refunded']) == 500
check('quote -> contract -> invoice -> payment -> refund flow keeps balances right', ok, str(res))

print('\n' + ('ALL CHECKS PASSED' if not failures else f'{len(failures)} FAILED: ' + '; '.join(failures)))
sys.exit(1 if failures else 0)
