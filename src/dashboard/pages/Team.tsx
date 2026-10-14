import { useMemo, useState } from 'react'
import { Plus, Trash2, Users, Pencil, ShieldCheck } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useCurrentUserId } from '@/lib/queries/ops'
import { useCompanyStaff, inviteStaffMember, updateStaffMember, removeStaffMember } from '@/lib/dashboardQueries'
import { useTeams, saveTeam, deleteTeam, setTeamMembers, TEAM_COLORS, type CompanyTeam } from '@/lib/queries/teams'
import { PERMISSION_GROUPS, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_PRESETS, effectivePermissions } from '@/lib/permissions'
import { Card, Button, Input, Select, Badge, Dialog } from '@/dashboard/components/primitives'
import { useToast, Avatar } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, EmptyLine, fmtNum } from './shared/night'
import type { CompanyStaff } from '@/types/dashboard'

const ROLE_OPTIONS = ['manager', 'agent', 'viewer'].map((r) => ({ value: r, label: ROLE_LABELS[r] }))

const TEAM_CSS = `
.tm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.tm-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 2px 9px; border-radius: 99px; border: 1px solid var(--line-2); color: var(--ink); }
.tm-chip i { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.tm-perm-group { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
.tm-perm-group h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: var(--ink); }
.tm-check { display: flex; align-items: center; gap: 9px; padding: 5px 0; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
.tm-check input { width: 16px; height: 16px; accent-color: var(--ink); flex: none; }
.tm-colors { display: flex; gap: 8px; flex-wrap: wrap; }
.tm-color { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
.tm-color[aria-pressed="true"] { border-color: var(--ink); box-shadow: 0 0 0 2px var(--panel); }
.tm-team { display: flex; gap: 12px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid var(--line); }
.tm-team:last-child { border-bottom: 0; }
.tm-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 5px; flex: none; }
.tm-icon-btn { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 6px; border-radius: 8px; display: grid; place-items: center; }
.tm-icon-btn:hover { background: var(--hover-bg); color: var(--ink); }
.tm-perm-note { font-size: 12px; color: var(--text-tertiary); margin: 0 0 12px; line-height: 1.7; }
`

export function DashboardV2Team() {
  const { companyId, isDemo, isOwner, can, userName } = useWorkspace()
  const pushToast = useToast()
  const { data: staff, refetch } = useCompanyStaff(companyId, isDemo)
  const { teams, members, byTeam, available } = useTeams(companyId, isDemo)
  const myId = useCurrentUserId(isDemo)
  const canManage = isOwner || isDemo || can('team.manage')

  const [invite, setInvite] = useState<{ open: boolean; full_name: string; email: string; role: string; busy: boolean }>({ open: false, full_name: '', email: '', role: 'agent', busy: false })
  const [permFor, setPermFor] = useState<CompanyStaff | null>(null)
  const [permDraft, setPermDraft] = useState<Set<string>>(new Set())
  const [teamDlg, setTeamDlg] = useState<{ open: boolean; id?: string; name: string; color: string; description: string; userIds: string[]; busy: boolean }>({ open: false, name: '', color: TEAM_COLORS[0], description: '', userIds: [], busy: false })

  // Team membership is keyed by login id; in the tour the staff row id stands in for it.
  const uid = (s: CompanyStaff) => (isDemo ? s.id : s.auth_user_id || '')
  const people = useMemo(() => (staff || []).filter((s) => s.role !== 'owner'), [staff])
  const nameOf = (id: string) => (staff || []).find((s) => uid(s) === id)?.full_name || (id === myId ? userName : '') || 'مالك الحساب'
  const teamsOf = (s: CompanyStaff) => teams.filter((t) => members.some((m) => m.team_id === t.id && m.auth_user_id === uid(s)))

  async function sendInvite() {
    if (!companyId || !invite.full_name.trim() || !invite.email.trim()) { pushToast({ kind: 'danger', title: 'اكتب الاسم والبريد' }); return }
    setInvite((i) => ({ ...i, busy: true }))
    try {
      if (!isDemo) await inviteStaffMember({ company_id: companyId, email: invite.email, full_name: invite.full_name, role: invite.role })
      await refetch()
      pushToast({ kind: 'success', title: isDemo ? 'هذي نسخة تجريبية، ما انرسلت دعوة فعلية' : 'أرسلنا الدعوة بالبريد' })
      setInvite({ open: false, full_name: '', email: '', role: 'agent', busy: false })
    } catch {
      pushToast({ kind: 'danger', title: 'تعذّر إرسال الدعوة' })
      setInvite((i) => ({ ...i, busy: false }))
    }
  }

  async function changeRole(s: CompanyStaff, role: string) {
    try {
      // A role change resets to that role's preset; custom permissions are set from the permissions dialog.
      if (!isDemo) await updateStaffMember(s.id, { role, permissions: [] })
      await refetch()
      pushToast({ kind: 'success', title: `صارت صلاحية ${s.full_name} «${ROLE_LABELS[role]}»` })
    } catch { pushToast({ kind: 'danger', title: 'تعذّر تغيير الصلاحية' }) }
  }

  async function removeMember(s: CompanyStaff) {
    if (!window.confirm(`حذف ${s.full_name} من الفريق؟`)) return
    try {
      if (!isDemo) await removeStaffMember(s.id)
      await refetch()
    } catch { pushToast({ kind: 'danger', title: 'تعذّر الحذف' }) }
  }

  function openPerms(s: CompanyStaff) {
    setPermFor(s)
    setPermDraft(effectivePermissions(s.role, s.permissions))
  }
  function toggleDraft(key: string) {
    setPermDraft((d) => { const n = new Set(d); if (n.has(key)) n.delete(key); else n.add(key); return n })
  }
  async function savePerms() {
    if (!permFor) return
    try {
      if (!isDemo) await updateStaffMember(permFor.id, { permissions: [...permDraft] })
      await refetch()
      pushToast({ kind: 'success', title: 'انحفظت الصلاحيات' })
      setPermFor(null)
    } catch { pushToast({ kind: 'danger', title: 'تعذّر الحفظ' }) }
  }

  function openTeam(t?: CompanyTeam) {
    setTeamDlg({
      open: true, id: t?.id, name: t?.name || '', color: t?.color || TEAM_COLORS[teams.length % TEAM_COLORS.length],
      description: t?.description || '', userIds: t ? byTeam.get(t.id) || [] : [], busy: false,
    })
  }
  async function submitTeam() {
    if (!teamDlg.name.trim()) { pushToast({ kind: 'danger', title: 'اكتب اسم الفريق' }); return }
    setTeamDlg((d) => ({ ...d, busy: true }))
    try {
      const teamId = await saveTeam(companyId, isDemo, { id: teamDlg.id, name: teamDlg.name, color: teamDlg.color, description: teamDlg.description })
      await setTeamMembers(companyId, isDemo, teamId, teamDlg.userIds)
      setTeamDlg((d) => ({ ...d, open: false, busy: false }))
      pushToast({ kind: 'success', title: 'انحفظ الفريق' })
    } catch {
      pushToast({ kind: 'danger', title: 'تعذّر حفظ الفريق، يمكن الاسم مكرر' })
      setTeamDlg((d) => ({ ...d, busy: false }))
    }
  }
  async function removeTeam(t: CompanyTeam) {
    if (!window.confirm(`حذف فريق «${t.name}»؟ المحادثات المحوّلة له تبقى لكن بدون فريق.`)) return
    try { await deleteTeam(companyId, isDemo, t.id) } catch { pushToast({ kind: 'danger', title: 'تعذّر الحذف' }) }
  }

  return (
    <NightPage>
      <style>{TEAM_CSS}</style>
      <PageHead
        title="الفريق والصلاحيات"
        sub="أضف أعضاء فريقك، قسّمهم لفرق، وحدّد لكل واحد وش يشوف وش يسوي"
        actions={canManage ? <Button onClick={() => setInvite((i) => ({ ...i, open: true }))}><Plus size={15} /> دعوة عضو</Button> : undefined}
      />
      {!available && <Card><EmptyLine>الفرق غير مفعّلة على هذا الحساب بعد.</EmptyLine></Card>}

      <Card>
        <CardTitle aside={`${fmtNum(people.length + 1)} عضو`}><Users size={16} style={{ color: 'var(--sky)' }} /> الأعضاء</CardTitle>
        <div className="np-row">
          <Avatar name={userName || 'م'} size={34} />
          <div className="np-row-main"><b>{isOwner ? userName || 'أنت' : 'مالك الحساب'}</b><small>كل الصلاحيات دائمًا</small></div>
          <Badge tone="brand">{ROLE_LABELS.owner}</Badge>
        </div>
        {people.length === 0 && <EmptyLine>ما أضفت أحد بعد، ادعُ أول عضو من الزر فوق.</EmptyLine>}
        {people.map((s) => (
          <div key={s.id} className="np-row" style={{ flexWrap: 'wrap' }}>
            <Avatar name={s.full_name || ''} size={34} />
            <div className="np-row-main">
              <b>{s.full_name}</b>
              <div className="tm-chips" style={{ marginTop: 4 }}>
                {!s.auth_user_id && !isDemo && <Badge tone="warning">بانتظار القبول</Badge>}
                {teamsOf(s).map((t) => <span key={t.id} className="tm-chip"><i style={{ background: t.color }} />{t.name}</span>)}
              </div>
            </div>
            {canManage ? (
              <>
                <Select options={ROLE_OPTIONS.some((o) => o.value === s.role) ? ROLE_OPTIONS : [{ value: s.role, label: ROLE_LABELS[s.role] || s.role }, ...ROLE_OPTIONS]} value={s.role} onChange={(e) => changeRole(s, e.target.value)} style={{ width: 130 }} />
                <Button variant="secondary" size="sm" onClick={() => openPerms(s)}><ShieldCheck size={14} /> الصلاحيات</Button>
                <button type="button" className="tm-icon-btn" aria-label={`حذف ${s.full_name}`} onClick={() => removeMember(s)}><Trash2 size={15} /></button>
              </>
            ) : <Badge tone="neutral">{ROLE_LABELS[s.role] || s.role}</Badge>}
          </div>
        ))}
      </Card>

      <Card>
        <CardTitle aside={canManage ? <Button variant="secondary" size="sm" onClick={() => openTeam()}><Plus size={14} /> فريق جديد</Button> : undefined}>الفرق</CardTitle>
        {teams.length === 0 && <EmptyLine>ما فيه فرق. سوّ فريق مثل «المبيعات» أو «الدعم»، وبعدها تقدر تحوّل له المحادثات من الصندوق.</EmptyLine>}
        {teams.map((t) => {
          const ids = byTeam.get(t.id) || []
          return (
            <div key={t.id} className="tm-team">
              <span className="tm-dot" style={{ background: t.color }} />
              <div className="np-row-main">
                <b>{t.name}</b>
                {t.description && <small>{t.description}</small>}
                <div className="tm-chips" style={{ marginTop: 6 }}>
                  {ids.length === 0 && <small style={{ color: 'var(--text-tertiary)' }}>بدون أعضاء</small>}
                  {ids.map((id) => <span key={id} className="tm-chip">{nameOf(id)}</span>)}
                </div>
              </div>
              {canManage && (
                <>
                  <button type="button" className="tm-icon-btn" aria-label={`تعديل ${t.name}`} onClick={() => openTeam(t)}><Pencil size={15} /></button>
                  <button type="button" className="tm-icon-btn" aria-label={`حذف ${t.name}`} onClick={() => removeTeam(t)}><Trash2 size={15} /></button>
                </>
              )}
            </div>
          )
        })}
      </Card>

      <Card>
        <CardTitle>الأدوار الجاهزة</CardTitle>
        {Object.keys(ROLE_DESCRIPTIONS).map((r) => (
          <div key={r} className="np-row">
            <div className="np-row-main"><b>{ROLE_LABELS[r]}</b><small>{ROLE_DESCRIPTIONS[r]}</small></div>
            <Badge tone="neutral">{fmtNum((ROLE_PRESETS[r] || []).length)} صلاحية</Badge>
          </div>
        ))}
      </Card>

      <Dialog
        open={invite.open} title="دعوة عضو" onClose={() => setInvite((i) => ({ ...i, open: false }))}
        footer={<><Button variant="secondary" onClick={() => setInvite((i) => ({ ...i, open: false }))}>إلغاء</Button><Button onClick={sendInvite} disabled={invite.busy}>{invite.busy ? 'جارِ الإرسال...' : 'إرسال الدعوة'}</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>يوصله بريد يعيّن فيه كلمة المرور ويدخل بحسابه الخاص.</div>
          <Input label="الاسم الكامل" value={invite.full_name} onChange={(e) => setInvite((i) => ({ ...i, full_name: e.target.value }))} />
          <Input label="البريد الإلكتروني" type="email" value={invite.email} onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))} />
          <Select label="الدور" options={ROLE_OPTIONS} value={invite.role} onChange={(e) => setInvite((i) => ({ ...i, role: e.target.value }))} />
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{ROLE_DESCRIPTIONS[invite.role]}</div>
        </div>
      </Dialog>

      <Dialog
        open={!!permFor} title={permFor ? `صلاحيات ${permFor.full_name}` : ''} onClose={() => setPermFor(null)}
        footer={<><Button variant="secondary" onClick={() => setPermFor(null)}>إلغاء</Button><Button onClick={savePerms}>حفظ</Button></>}
      >
        <p className="tm-perm-note">اختر بالضبط وش يقدر يسوي هذا العضو. لو رجّعته لدور جاهز من القائمة يرجع على صلاحيات الدور.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55vh', overflowY: 'auto' }}>
          {PERMISSION_GROUPS.map((g) => (
            <div key={g.id} className="tm-perm-group">
              <h4>{g.label}</h4>
              {g.items.map((it) => (
                <label key={it.key} className="tm-check">
                  <input type="checkbox" checked={permDraft.has(it.key)} onChange={() => toggleDraft(it.key)} />
                  {it.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      </Dialog>

      <Dialog
        open={teamDlg.open} title={teamDlg.id ? 'تعديل الفريق' : 'فريق جديد'} onClose={() => setTeamDlg((d) => ({ ...d, open: false }))}
        footer={<><Button variant="secondary" onClick={() => setTeamDlg((d) => ({ ...d, open: false }))}>إلغاء</Button><Button onClick={submitTeam} disabled={teamDlg.busy}>{teamDlg.busy ? 'جارِ الحفظ...' : 'حفظ'}</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="اسم الفريق" value={teamDlg.name} onChange={(e) => setTeamDlg((d) => ({ ...d, name: e.target.value }))} />
          <Input label="وصف قصير (اختياري)" value={teamDlg.description} onChange={(e) => setTeamDlg((d) => ({ ...d, description: e.target.value }))} />
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 6 }}>اللون</div>
            <div className="tm-colors">
              {TEAM_COLORS.map((c) => <button key={c} type="button" className="tm-color" style={{ background: c }} aria-label={c} aria-pressed={teamDlg.color === c} onClick={() => setTeamDlg((d) => ({ ...d, color: c }))} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 6 }}>الأعضاء</div>
            {isOwner && myId && (
              <label className="tm-check">
                <input type="checkbox" checked={teamDlg.userIds.includes(myId)} onChange={() => setTeamDlg((d) => ({ ...d, userIds: d.userIds.includes(myId) ? d.userIds.filter((x) => x !== myId) : [...d.userIds, myId] }))} />
                {userName || 'أنت'} <span style={{ color: 'var(--text-tertiary)', fontSize: 11.5 }}>· مالك الحساب</span>
              </label>
            )}
            {people.filter((s) => uid(s)).map((s) => (
              <label key={s.id} className="tm-check">
                <input
                  type="checkbox" checked={teamDlg.userIds.includes(uid(s))}
                  onChange={() => setTeamDlg((d) => ({ ...d, userIds: d.userIds.includes(uid(s)) ? d.userIds.filter((x) => x !== uid(s)) : [...d.userIds, uid(s)] }))}
                />
                {s.full_name} <span style={{ color: 'var(--text-tertiary)', fontSize: 11.5 }}>· {ROLE_LABELS[s.role] || s.role}</span>
              </label>
            ))}
          </div>
        </div>
      </Dialog>
    </NightPage>
  )
}
