'use client';

import { useMemo, useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { importGiftListAction } from '@/app/(console)/console/events/[eventKey]/gifts/actions';
import { parseGiftList, type GiftListMember } from '@/lib/tbx/gift-list';

export function GiftListImport({
  eventKey,
  members,
  formerNames,
}: {
  eventKey: string;
  members: GiftListMember[];
  formerNames: string[];
}) {
  const [list, setList] = useState('');
  const rows = useMemo(() => (list.trim() ? parseGiftList(list, members, formerNames) : []), [list, members, formerNames]);
  const unmatched = rows.filter((row) => !row.donorMemberId).length;

  return (
    <ActionForm action={importGiftListAction} className="flex flex-col gap-3" onSuccess={() => setList('')}>
      <input type="hidden" name="eventKey" value={eventKey} />
      <label className="tb-label" htmlFor="gift-list">
        貼上 LINE 接龍清單
        <textarea
          id="gift-list"
          name="list"
          className="tb-textarea min-h-[160px] font-mono text-xs"
          placeholder={'1.    又帆 紅酒一瓶\n2.    子宜 紅酒1瓶'}
          value={list}
          onChange={(event) => setList(event.target.value)}
        />
      </label>
      <p className="text-xs text-tb-faint">
        每一行「編號. 提供者 品項」新增一份禮物，提供者用名字開頭即可（又帆、子宜）。同一份清單重貼不會重複新增。
      </p>
      {rows.length > 0 ? (
        <div className="tb-table-wrap max-h-[320px] overflow-y-auto">
          <table className="tb-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>提供者</th>
                <th>禮物</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.line}-${row.raw}`}>
                  <td className="num">{row.line}</td>
                  <td>
                    {row.donorMemberName ?? (
                      <span className="text-tb-late">{row.donorName ? `${row.donorName}（非會員）` : '未填'}</span>
                    )}
                  </td>
                  <td>
                    {row.name}
                    {row.note ? <span className="ml-2 tb-chip tb-chip-gold px-1.5 py-0 text-[10px]">{row.note}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton disabled={rows.length === 0} pendingText="新增中…">
          {rows.length ? `新增 ${rows.length} 份禮物` : '新增禮物'}
        </SubmitButton>
        {unmatched ? <span className="text-xs text-tb-muted">{unmatched} 份的提供者不在會員名冊，會以文字記錄。</span> : null}
      </div>
    </ActionForm>
  );
}
