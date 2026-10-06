'use client';

import { useState, type ReactNode } from 'react';
import { createGiftAction, updateGiftAction } from '@/app/(console)/console/events/[eventKey]/gifts/actions';
import { ActionForm, DialogButton, SubmitButton } from '@/components/tbx/client';
import type { MemberOption } from '@/components/tbx/gifts/labels';

export interface GiftFormValue {
  id: string;
  name: string;
  quantity: number;
  donorMemberId: string | null;
  donorName: string | null;
  donorLabel: string | null;
  note: string | null;
}

type DonorMode = 'member' | 'other';

function GiftFields({ idPrefix, members, gift }: { idPrefix: string; members: MemberOption[]; gift?: GiftFormValue }) {
  const [mode, setMode] = useState<DonorMode>(() => {
    if (gift) return gift.donorMemberId ? 'member' : 'other';
    return members.length > 0 ? 'member' : 'other';
  });

  // A donor who has left the roster still has to be selectable, or saving would drop them.
  const options =
    gift?.donorMemberId && !members.some((member) => member.id === gift.donorMemberId)
      ? [{ id: gift.donorMemberId, name: gift.donorLabel ?? '（已不在名冊的會員）' }, ...members]
      : members;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
        <label className="tb-label" htmlFor={`${idPrefix}-name`}>
          禮物名稱
          <input
            id={`${idPrefix}-name`}
            name="name"
            className="tb-input"
            defaultValue={gift?.name ?? ''}
            maxLength={80}
            required
            autoComplete="off"
            placeholder="例：高山茶禮盒"
          />
        </label>
        <label className="tb-label" htmlFor={`${idPrefix}-quantity`}>
          數量
          <input
            id={`${idPrefix}-quantity`}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            step={1}
            className="tb-input"
            defaultValue={gift?.quantity ?? 1}
            required
          />
        </label>
      </div>

      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-xs font-semibold text-tb-muted">提供者</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex min-h-[32px] items-center gap-2 text-sm" htmlFor={`${idPrefix}-donor-member`}>
            <input
              id={`${idPrefix}-donor-member`}
              type="radio"
              name="donorMode"
              value="member"
              checked={mode === 'member'}
              onChange={() => setMode('member')}
            />
            會員
          </label>
          <label className="flex min-h-[32px] items-center gap-2 text-sm" htmlFor={`${idPrefix}-donor-other`}>
            <input
              id={`${idPrefix}-donor-other`}
              type="radio"
              name="donorMode"
              value="other"
              checked={mode === 'other'}
              onChange={() => setMode('other')}
            />
            其他（來賓、公司，或之後再補）
          </label>
        </div>

        {mode === 'member' ? (
          <label className="tb-label" htmlFor={`${idPrefix}-donor-member-id`}>
            提供禮物的會員
            <select
              id={`${idPrefix}-donor-member-id`}
              name="donorMemberId"
              className="tb-select"
              defaultValue={gift?.donorMemberId ?? ''}
              required
            >
              <option value="">請選擇會員</option>
              {options.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="tb-label" htmlFor={`${idPrefix}-donor-name`}>
            提供者名稱
            <input
              id={`${idPrefix}-donor-name`}
              name="donorName"
              className="tb-input"
              defaultValue={gift?.donorMemberId ? '' : gift?.donorName ?? ''}
              maxLength={80}
              autoComplete="off"
              placeholder="例：王大明（來賓）、某某公司。還不知道可以先留空"
            />
          </label>
        )}
      </fieldset>

      <label className="tb-label" htmlFor={`${idPrefix}-note`}>
        備註（只有領導團隊看得到）
        <textarea id={`${idPrefix}-note`} name="note" className="tb-textarea" rows={2} maxLength={300} defaultValue={gift?.note ?? ''} />
      </label>
    </>
  );
}

export function AddGiftDialog({
  eventKey,
  members,
  label,
  className,
}: {
  eventKey: string;
  members: MemberOption[];
  label: ReactNode;
  className?: string;
}) {
  return (
    <DialogButton label={label} title="新增禮物" className={className ?? 'tb-btn-gold'}>
      {(close) => (
        <ActionForm action={createGiftAction} className="flex flex-col gap-3" onSuccess={close}>
          <input type="hidden" name="eventKey" value={eventKey} />
          <GiftFields idPrefix="gift-new" members={members} />
          <div className="flex justify-end">
            <SubmitButton>新增禮物</SubmitButton>
          </div>
        </ActionForm>
      )}
    </DialogButton>
  );
}

export function EditGiftDialog({ eventKey, gift, members }: { eventKey: string; gift: GiftFormValue; members: MemberOption[] }) {
  return (
    <DialogButton label="編輯" title={`編輯禮物：${gift.name}`} className="tb-btn-sm">
      {(close) => (
        <ActionForm action={updateGiftAction} className="flex flex-col gap-3" onSuccess={close}>
          <input type="hidden" name="eventKey" value={eventKey} />
          <input type="hidden" name="giftId" value={gift.id} />
          <GiftFields idPrefix={`gift-${gift.id}`} members={members} gift={gift} />
          <div className="flex justify-end">
            <SubmitButton>儲存禮物</SubmitButton>
          </div>
        </ActionForm>
      )}
    </DialogButton>
  );
}
