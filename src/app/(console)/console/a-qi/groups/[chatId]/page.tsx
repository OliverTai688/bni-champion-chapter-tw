import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, ConfirmSubmit, SubmitButton } from '@/components/tbx/client';
import { LeaderOnlyNotice } from '@/components/tbx/members/leader-only';
import { Card, Empty, PageHeader } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import { GROUP_CATEGORIES, GROUP_CATEGORY_LABEL, getGroup, listGroupMessages } from '@/server/a-qi/groups';
import { isObjectId } from '@/server/tbx/action';
import { isLeader } from '@/server/tbx/viewer';
import { deleteGroupMessagesAction, refreshGroupSummaryAction, saveGroupProfileAction, setRecordingAction } from '../actions';

type SearchParams = Promise<{ q?: string | string[]; before?: string | string[] }>;

const TYPE_LABEL: Record<string, string> = {
  image: '照片',
  video: '影片',
  audio: '語音',
  file: '檔案',
  sticker: '貼圖',
  location: '位置',
};

const ATTACHMENT_NOTE: Record<string, string> = {
  pending: '下載中',
  failed: '下載失敗',
  not_stored: '沒有保存',
  too_large: '檔案太大（超過 50MB），沒有保存',
};

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

export default async function AQiGroupPage({ params, searchParams }: { params: Promise<{ chatId: string }>; searchParams: SearchParams }) {
  if (!(await isLeader())) return <LeaderOnlyNotice />;
  const { chatId } = await params;
  if (!isObjectId(chatId)) notFound();
  const group = await getGroup(chatId);
  if (!group) notFound();

  const query = first((await searchParams).q).slice(0, 80);
  const beforeRaw = first((await searchParams).before);
  const before = beforeRaw && !Number.isNaN(Date.parse(beforeRaw)) ? new Date(beforeRaw) : null;
  const { messages, nextBefore } = await listGroupMessages(group.id, { query, before });
  const title = group.name ?? (group.kind === 'room' ? '多人聊天室' : '未命名群組');
  const pushCost = group.memberCount ? `約 ${group.memberCount} 則` : '群組人數那麼多則';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <Link href="/console/a-qi/groups" className="no-underline">
            阿麒工作室 › 群組
          </Link>
        }
        title={title}
        description={`加入 ${formatDateTime(group.joinedAt)}${group.memberCount ? `・${group.memberCount} 人` : ''}・已記錄 ${group.messageCount} 則${group.leftAt ? `・${formatDateTime(group.leftAt)} 離開` : ''}`}
        actions={
          group.leftAt ? null : (
            <ActionForm action={refreshGroupSummaryAction}>
              <input type="hidden" name="chatId" value={group.id} />
              <SubmitButton plain className="tb-btn-sm" pendingText="更新中…">
                更新名稱和人數
              </SubmitButton>
            </ActionForm>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="群組檔案" aside={group.purposeStatus === 'suggested' ? <span>阿麒的推測，請確認</span> : group.purposeStatus === 'confirmed' ? <span>已確認</span> : null}>
          <ActionForm action={saveGroupProfileAction} className="flex flex-col gap-3">
            <input type="hidden" name="chatId" value={group.id} />
            <label className="tb-label" htmlFor="group-category">
              類型
              <select id="group-category" name="category" className="tb-select" defaultValue={group.category ?? ''}>
                <option value="">還不確定</option>
                {GROUP_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {GROUP_CATEGORY_LABEL[category]}
                  </option>
                ))}
              </select>
            </label>
            <label className="tb-label" htmlFor="group-purpose">
              用途
              <textarea
                id="group-purpose"
                name="purpose"
                className="tb-textarea"
                rows={3}
                maxLength={300}
                defaultValue={group.purpose ?? ''}
                placeholder="例：分會全體會員的公告和人才接龍"
              />
            </label>
            <div>
              <SubmitButton>儲存</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <Card title="記錄">
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {group.leftAt ? (
                <span className="tb-chip">已離開</span>
              ) : group.archiveEnabled ? (
                <span className="tb-chip tb-chip-present">記錄中</span>
              ) : (
                <span className="tb-chip tb-chip-plain">未記錄</span>
              )}
              <span className="ml-2 text-tb-muted">
                {group.recordingAnnouncedAt ? `已在群組公告（${formatDateTime(group.recordingAnnouncedAt)}）` : '還沒在群組公告過'}
              </span>
            </p>
            {group.leftAt ? null : (
              <ActionForm action={setRecordingAction}>
                <input type="hidden" name="chatId" value={group.id} />
                <input type="hidden" name="enable" value={group.archiveEnabled ? 'false' : 'true'} />
                {group.archiveEnabled ? (
                  <SubmitButton plain pendingText="處理中…">
                    停止記錄
                  </SubmitButton>
                ) : group.recordingAnnouncedAt ? (
                  <SubmitButton pendingText="處理中…">開始記錄</SubmitButton>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-tb-muted">
                      開始記錄時，阿麒會在群組發一則公告說明會記錄。這是推播，會用掉官方帳號本月 {pushCost}的額度。
                    </p>
                    <ConfirmSubmit confirmText="確定公告並開始記錄" className="tb-btn-gold">
                      開始記錄
                    </ConfirmSubmit>
                  </>
                )}
              </ActionForm>
            )}
            {group.messageCount > 0 ? (
              <ActionForm action={deleteGroupMessagesAction}>
                <input type="hidden" name="chatId" value={group.id} />
                <p className="mb-2 text-xs text-tb-muted">刪除這個群組已記錄的全部訊息、照片和檔案，無法復原。</p>
                <ConfirmSubmit confirmText={`確定刪除 ${group.messageCount} 則`}>刪除全部記錄</ConfirmSubmit>
              </ActionForm>
            ) : null}
          </div>
        </Card>
      </div>

      <Card title="訊息" aside={query ? <span>搜尋「{query}」</span> : <span>最新的在上面</span>} bodyClassName="p-0">
        <form className="flex gap-2 border-b border-tb-line p-3" action={`/console/a-qi/groups/${group.id}`}>
          <input name="q" className="tb-input" defaultValue={query} placeholder="搜尋文字、發言者或檔名" aria-label="搜尋訊息" />
          <button type="submit" className="tb-btn">
            搜尋
          </button>
        </form>
        {messages.length === 0 ? (
          <div className="p-4">
            <Empty title={query ? '找不到符合的訊息' : '還沒有記錄到訊息'} hint={group.archiveEnabled ? undefined : '這個群組目前沒有在記錄。'} />
          </div>
        ) : (
          <ol className="flex flex-col">
            {messages.map((message) => (
              <li key={message.id} className="flex flex-col gap-1 border-b border-tb-line px-4 py-3 last:border-b-0">
                <div className="flex flex-wrap items-baseline gap-2 text-xs text-tb-muted">
                  <span className="font-semibold text-tb-text">{message.deleted ? '（已刪除）' : message.senderName ?? '（名稱未知）'}</span>
                  {message.isMember ? <span className="tb-chip tb-chip-gold">會員</span> : null}
                  {message.mentionsBot ? <span className="tb-chip tb-chip-plain">@阿麒</span> : null}
                  <span>{formatDateTime(message.sentAt)}</span>
                </div>
                {message.deleted ? (
                  <p className="text-sm text-tb-faint">傳送者已要求刪除這則訊息。</p>
                ) : (
                  <>
                    {message.text ? <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p> : null}
                    {message.type !== 'text' ? (
                      <p className="text-sm text-tb-muted">
                        [{TYPE_LABEL[message.type] ?? message.type}]{message.fileName ? ` ${message.fileName}` : ''}{' '}
                        {message.url ? (
                          <a href={message.url} target="_blank" rel="noreferrer">
                            開啟
                          </a>
                        ) : message.attachmentStatus ? (
                          <span className="text-tb-faint">{ATTACHMENT_NOTE[message.attachmentStatus] ?? ''}</span>
                        ) : null}
                      </p>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
        {nextBefore ? (
          <div className="border-t border-tb-line p-3">
            <Link
              className="tb-btn tb-btn-sm"
              href={`/console/a-qi/groups/${group.id}?${new URLSearchParams({ ...(query ? { q: query } : {}), before: nextBefore.toISOString() })}`}
            >
              更早的訊息
            </Link>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
