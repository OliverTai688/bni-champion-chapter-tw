import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Printer } from 'lucide-react';
import SeatingArranger from '@/components/SeatingArranger';
import { leaderGuard } from '@/components/tbx/leader-guard';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { Card } from '@/components/tbx/ui';
import { listAdminEventSessions, listSeatTemplates } from '@/server/repositories/admin-event-sessions-repository';
import { getGridSeatView } from '@/server/tbx/grid-seat-map';
import { loadSeatingEditorState } from '@/server/seating/seating-page-state';
import { getEventByKey } from '@/server/tbx/events';
import { getAttendance } from '@/server/tbx/participation';
import { createGridSeatMapAction, saveSeatTemplateAction } from '../actions';

export default async function GridSeatingPage({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  const denied = await leaderGuard();
  if (denied) return denied;
  const event = await getEventByKey(eventKey);
  if (!event) notFound();

  const key = encodeURIComponent(event.weekId);
  const isWeekly = /^\d{4}-\d{2}-\d{2}$/.test(event.weekId);
  const state = isWeekly ? await loadSeatingEditorState(event.weekId) : null;

  if (!state || state.loadedFrom !== 'database') {
    const [sessions, templates] = await Promise.all([listAdminEventSessions(), listSeatTemplates()]);
    const sources = sessions.filter((session) => session.latestSeatMap && session.weekId !== event.weekId);
    return (
      <div className="flex flex-col gap-5">
        {!isWeekly ? (
          <Card title="格狀排座">
            <p className="text-sm text-tb-muted">
              格狀排座只用於每週例會。這場活動請用
              <Link href={`/console/events/${key}/seating`} className="mx-1 text-tb-gold">
                平面座位表
              </Link>
              。
            </p>
          </Card>
        ) : (
          <Card title="建立格狀座位表" aside={<span>每週例會</span>}>
            <ActionForm action={createGridSeatMapAction} className="flex max-w-[560px] flex-col gap-3">
              <input type="hidden" name="eventKey" value={event.weekId} />
              <label className="tb-label" htmlFor="grid-source">
                從哪裡開始
                <select id="grid-source" name="sourceKind" className="tb-select" defaultValue={sources.length ? 'latest_event' : 'base_template'}>
                  <option value="latest_event">複製最近一場例會</option>
                  <option value="selected_event">複製指定的例會</option>
                  <option value="named_template">使用範本</option>
                  <option value="base_template">使用內建的基本座位表</option>
                </select>
              </label>
              <label className="tb-label" htmlFor="grid-source-event">
                指定的例會（選「複製指定的例會」時）
                <select id="grid-source-event" name="sourceWeekId" className="tb-select" defaultValue="">
                  <option value="">不指定</option>
                  {sources.map((session) => (
                    <option key={session.weekId} value={session.weekId}>
                      {session.weekId}・{session.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tb-label" htmlFor="grid-source-template">
                範本（選「使用範本」時）
                <select id="grid-source-template" name="sourceTemplateId" className="tb-select" defaultValue="">
                  <option value="">不指定</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-tb-faint">複製後可以拖拉調整，請假與代理名單會顯示在編輯器上方。</p>
              <div>
                <SubmitButton pendingText="建立中…">建立格狀座位表</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        )}
      </div>
    );
  }

  const [{ rows }, grid] = await Promise.all([getAttendance(event.id), getGridSeatView(event.weekId, event.id)]);
  const seatedNames = new Set([...(grid?.top ?? []), ...(grid?.main ?? [])].map((seat) => seat.name).filter(Boolean));
  const members = rows.filter((row) => row.kind === 'member');
  const away = members.filter((row) => row.status === 'absent' || row.status === 'medical');
  const awayButSeated = away.filter((row) => seatedNames.has(row.displayName));
  const substitutes = members.filter((row) => row.status === 'substitute');
  const expectedNotSeated = members.filter(
    (row) => (row.status === 'expected' || row.status === 'present' || row.status === 'late') && !seatedNames.has(row.displayName),
  );
  const guestsNotSeated = rows.filter((row) => row.kind === 'guest' && !seatedNames.has(row.displayName));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="tb-eyebrow">格狀排座</div>
          <p className="mt-0.5 text-sm text-tb-muted">拖拉座位後按「保存」寫入資料庫；公開頁、會員頁和報表都會讀這一版。</p>
        </div>
        <a href={`/print/events/${key}`} target="_blank" rel="noreferrer" className="tb-btn tb-btn-sm">
          <Printer className="h-4 w-4" aria-hidden />
          列印已儲存的座位表
        </a>
        <Link href={`/console/events/${key}/seating?mode=plan`} className="tb-btn tb-btn-quiet tb-btn-sm">
          平面座位表
        </Link>
      </div>

      <Card title="出席與座位提醒" aside={<Link href={`/console/events/${key}/attendance`}>出席與代理</Link>}>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
          <HintRow tone="bad" label="請假仍在座位上" names={awayButSeated.map((row) => row.displayName)} empty="沒有" />
          <HintRow
            tone="sub"
            label="代理"
            names={substitutes.map((row) => `${row.displayName} → ${row.substituteName ?? '代理人'}${row.substituteArrivedAt ? '（已到）' : ''}`)}
            empty="沒有"
          />
          <HintRow tone="late" label="會出席但還沒排座" names={expectedNotSeated.map((row) => row.displayName)} empty="沒有" />
          <HintRow tone="guest" label="已登記但沒排座的來賓" names={guestsNotSeated.map((row) => row.displayName)} empty="沒有" />
          <HintRow tone="muted" label="請假" names={away.map((row) => row.displayName)} empty="沒有" />
        </ul>
      </Card>

      <div className="rounded-xl bg-background py-6 text-foreground">
        <SeatingArranger
          key={`${state.week.id}-${state.updatedAt}`}
          week={state.week}
          initialLayout={state.layout}
          initialHeroes={state.heroes}
          initialMemberRoster={state.memberRoster}
          initialIndustryChains={state.industryChains}
          serverUpdatedAt={state.updatedAt}
          canSaveRemote
          printHref={`/print/events/${key}`}
        />
      </div>

      <Card title="存成範本">
        <ActionForm action={saveSeatTemplateAction} className="flex max-w-[560px] flex-col gap-3" resetOnSuccess>
          <input type="hidden" name="eventKey" value={event.weekId} />
          <label className="tb-label" htmlFor="template-name">
            範本名稱
            <input id="template-name" name="name" className="tb-input" defaultValue={`${event.title} 範本`} maxLength={60} required />
          </label>
          <label className="tb-label" htmlFor="template-description">
            說明（選填）
            <input id="template-description" name="description" className="tb-input" maxLength={120} />
          </label>
          <p className="text-xs text-tb-faint">會存目前「已儲存」的版本。同名範本會被更新。</p>
          <div>
            <SubmitButton className="tb-btn-outline">存成範本</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}

function HintRow({ tone, label, names, empty }: { tone: string; label: string; names: string[]; empty: string }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="w-[150px] shrink-0 font-semibold" style={tone === 'muted' ? undefined : { color: `var(--tb-${tone})` }}>
        {label}（{names.length}）
      </span>
      <span className="min-w-0 flex-1 text-tb-muted">{names.length ? names.join('、') : empty}</span>
    </li>
  );
}
