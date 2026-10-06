import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Star, TrafficCone } from 'lucide-react';
import { ActionForm, ConfirmSubmit, SubmitButton } from '@/components/tbx/client';
import { LeaderOnlyNotice } from '@/components/tbx/members/leader-only';
import { EditMemberButton } from '@/components/tbx/members/member-dialogs';
import { toMemberFormValues } from '@/components/tbx/members/member-values';
import { Card, Empty, PageHeader, Stat, StatusChip } from '@/components/tbx/ui';
import { formatEventDate, taipeiDateKey } from '@/lib/tbx/labels';
import { getMemberDetail, getMemberRosterMeta, type MemberDetail } from '@/server/tbx/member-admin';
import { isLeader } from '@/server/tbx/viewer';
import { setMemberActiveAction, setMemberCategoryAction } from '../actions';

type RoleTerm = MemberDetail['currentTerms'][number];

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-semibold text-tb-faint">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{children || <span className="text-tb-faint">未填</span>}</dd>
    </div>
  );
}

function TermList({ terms, tone }: { terms: RoleTerm[]; tone: 'current' | 'upcoming' | 'past' }) {
  return (
    <ul className="flex flex-col gap-2">
      {terms.map((term) => (
        <li key={term.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={tone === 'current' ? 'tb-chip tb-chip-gold tb-chip-plain' : 'tb-chip tb-chip-plain'}>{term.role}</span>
          <span className="tb-mono text-xs text-tb-muted">
            {taipeiDateKey(term.startsAt)} 至 {term.endsAt ? taipeiDateKey(term.endsAt) : '未定'}
          </span>
          {term.note ? <span className="text-xs text-tb-faint">{term.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export default async function MemberDetailPage({ params }: { params: Promise<{ memberId: string }> }) {
  if (!(await isLeader())) return <LeaderOnlyNotice />;

  const { memberId } = await params;
  const [detail, meta] = await Promise.all([getMemberDetail(memberId), getMemberRosterMeta()]);
  if (!detail) notFound();

  const { member, currentTerms, upcomingTerms, pastTerms, recent, counts, starVotes } = detail;
  const isChapterMember = member.category === 'member';
  const scorecardHref = `/console/scorecard?q=${encodeURIComponent(member.displayName)}`;
  const hasTerms = currentTerms.length + upcomingTerms.length + pastTerms.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <Link href="/console/members" className="no-underline hover:text-tb-text">
            會員名冊 / 會員檔案
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {member.displayName}
            <span className={member.isActive ? 'tb-chip tb-chip-present' : 'tb-chip'}>{member.isActive ? '在籍' : '停用'}</span>
            {isChapterMember ? null : <span className="tb-chip tb-chip-gold">{member.category === 'guest' ? '非會員' : '未分類'}</span>}
          </span>
        }
        description={[member.adminGroup, member.industry, member.company].filter(Boolean).join('・') || undefined}
        actions={
          <>
            <Link href={scorecardHref} className="tb-btn">
              <TrafficCone className="h-4 w-4" aria-hidden="true" />
              看燈號
            </Link>
            <EditMemberButton member={toMemberFormValues(member)} groups={meta.groups} label="編輯資料" size="md" />
            <ActionForm action={setMemberActiveAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="memberId" value={member.id} />
              <input type="hidden" name="active" value={member.isActive ? '0' : '1'} />
              {member.isActive ? (
                <ConfirmSubmit confirmText="確定停用">停用</ConfirmSubmit>
              ) : (
                <SubmitButton className="tb-btn-sm tb-btn-outline" pendingText="恢復中…">
                  恢復
                </SubmitButton>
              )}
            </ActionForm>
          </>
        }
      />

      {isChapterMember ? null : (
        <div className="tb-banner">
          <p className="min-w-[220px] flex-1 text-sm">
            {member.category === 'guest'
              ? '這個名字已經標記為非會員，不會出現在會員名冊。如果其實是會員，可以改回來。'
              : '這個名字是座位表自動建立的，還沒有分類。是會員就加入名冊；不是就標記為非會員。'}
          </p>
          <ActionForm action={setMemberCategoryAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="memberId" value={member.id} />
            <input type="hidden" name="category" value="member" />
            <SubmitButton className="tb-btn-sm">設為會員</SubmitButton>
          </ActionForm>
          {member.category === 'guest' ? null : (
            <ActionForm action={setMemberCategoryAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="memberId" value={member.id} />
              <input type="hidden" name="category" value="guest" />
              <SubmitButton className="tb-btn-sm tb-btn-quiet">標記為非會員</SubmitButton>
            </ActionForm>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="會員資料">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="行政分組">{member.adminGroup}</Field>
            <Field label="入會日期">{member.joinedAt ? <span className="tb-mono">{taipeiDateKey(member.joinedAt)}</span> : null}</Field>
            <Field label="產業">{member.industry}</Field>
            <Field label="公司">{member.company}</Field>
            <Field label="電話">
              {member.phone ? (
                <a href={`tel:${member.phone.replace(/[^0-9+#]/g, '')}`} className="tb-mono text-tb-text">
                  {member.phone}
                </a>
              ) : null}
            </Field>
            <Field label="Email">
              {member.email ? (
                <a href={`mailto:${member.email}`} className="text-tb-text">
                  {member.email}
                </a>
              ) : null}
            </Field>
            <Field label="角色標籤">
              {member.roles.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {member.roles.map((role) => (
                    <span key={role} className="tb-chip tb-chip-plain">
                      {role}
                    </span>
                  ))}
                </span>
              ) : null}
            </Field>
            <Field label="別名">{member.aliases.join('、')}</Field>
            <Field label="自我介紹" wide>
              {member.intro}
            </Field>
            <Field label="目標客戶" wide>
              {member.targetCustomers}
            </Field>
            <Field label="備註（只有領導團隊看得到）" wide>
              {member.note}
            </Field>
          </dl>
        </Card>

        <div className="flex flex-col gap-5">
          <Card
            title="職位與任期"
            aside={
              <Link href="/console/settings/roles" className="tb-btn tb-btn-quiet tb-btn-sm">
                管理任期
              </Link>
            }
          >
            {hasTerms ? (
              <div className="flex flex-col gap-4">
                <section className="flex flex-col gap-2">
                  <h3 className="tb-eyebrow">現任</h3>
                  {currentTerms.length > 0 ? (
                    <TermList terms={currentTerms} tone="current" />
                  ) : (
                    <p className="text-sm text-tb-muted">目前沒有擔任職位。</p>
                  )}
                </section>
                {upcomingTerms.length > 0 ? (
                  <section className="flex flex-col gap-2">
                    <h3 className="tb-eyebrow">即將上任</h3>
                    <TermList terms={upcomingTerms} tone="upcoming" />
                  </section>
                ) : null}
                {pastTerms.length > 0 ? (
                  <section className="flex flex-col gap-2">
                    <h3 className="tb-eyebrow">歷任</h3>
                    <TermList terms={pastTerms} tone="past" />
                  </section>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-tb-muted">還沒有任何任期紀錄。到「設定 › 職位與任期」新增後，這裡會列出現任與歷任職位。</p>
            )}
          </Card>

          <Card title="長冠軍之星與燈號">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex">
                <Stat
                  value={starVotes}
                  label={
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-tb-gold" aria-hidden="true" />
                      長冠軍之星累計得票
                    </span>
                  }
                  tone="gold"
                />
              </div>
              <Link href={scorecardHref} className="tb-btn tb-btn-sm">
                在綠燈總覽查看 {member.displayName}
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Card title="近期出席" aside={recent.length > 0 ? `最近 ${recent.length} 場活動` : undefined} bodyClassName="flex flex-col">
        {recent.length === 0 ? (
          <div className="p-4">
            <Empty title="還沒有出席紀錄" hint="這位會員在活動登記出席、請假或簽到之後，這裡會列出最近 12 場的狀態。" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-y-4 border-b border-tb-line p-4">
              <Stat value={counts.present} label="出席" tone="ok" />
              <Stat value={counts.late} label="遲到" tone="late" />
              <Stat value={counts.substitute} label="代理" tone="sub" />
              <Stat
                value={counts.leave}
                label="請假"
                tone="bad"
                hint={counts.medical > 0 ? `其中病假 ${counts.medical} 次` : undefined}
              />
              {counts.expected > 0 ? <Stat value={counts.expected} label="未到（沒有簽到也沒請假）" /> : null}
            </div>
            <div className="tb-table-wrap">
              <table className="tb-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>活動</th>
                    <th>狀態</th>
                    <th>代理人</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap">
                        <span className="tb-mono">{formatEventDate(row.session.date)}</span>
                      </td>
                      <td>
                        <Link
                          href={`/console/events/${encodeURIComponent(row.session.weekId)}/attendance`}
                          className="font-bold text-tb-text no-underline hover:text-tb-gold"
                        >
                          {row.session.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">
                        <StatusChip status={row.status} substituteArrived={Boolean(row.substituteArrivedAt)} />
                      </td>
                      <td>{row.status === 'substitute' ? row.substituteName || '未填' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
