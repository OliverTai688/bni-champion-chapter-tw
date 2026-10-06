'use client';

import { useState } from 'react';
import { assignAwardAction, updateAwardAction } from '@/app/(console)/console/events/[eventKey]/gifts/actions';
import { ActionForm, DialogButton, SubmitButton } from '@/components/tbx/client';
import { personOptionLabel, winnerKindLabel, type PersonOption } from '@/components/tbx/gifts/labels';

export interface AwardFormValue {
  id: string;
  winnerParticipationId: string | null;
  winnerName: string;
  winnerKind: string | null;
  note: string | null;
}

type WinnerMode = 'present' | 'other';

/** Keeps the current winner as is. Must match the value the update action accepts. */
const KEEP_WINNER = 'keep';

function WinnerFields({ idPrefix, people, award }: { idPrefix: string; people: PersonOption[]; award?: AwardFormValue }) {
  const currentId = award?.winnerParticipationId ?? null;
  const currentListed = currentId
    ? people.some((person) => person.participationId === currentId && person.kind === award?.winnerKind)
    : false;
  // Keep the current winner selectable even when they are no longer checked in.
  const keepCurrent = Boolean(award && currentId && !currentListed);
  const hasChoices = people.length > 0 || keepCurrent;

  const [mode, setMode] = useState<WinnerMode>(() => {
    if (award) return currentId ? 'present' : 'other';
    return people.length > 0 ? 'present' : 'other';
  });

  return (
    <>
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-xs font-semibold text-tb-muted">得主</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex min-h-[32px] items-center gap-2 text-sm" htmlFor={`${idPrefix}-mode-present`}>
            <input
              id={`${idPrefix}-mode-present`}
              type="radio"
              name="winnerMode"
              value="present"
              checked={mode === 'present'}
              onChange={() => setMode('present')}
              disabled={!hasChoices}
            />
            從已簽到名單選
          </label>
          <label className="flex min-h-[32px] items-center gap-2 text-sm" htmlFor={`${idPrefix}-mode-other`}>
            <input
              id={`${idPrefix}-mode-other`}
              type="radio"
              name="winnerMode"
              value="other"
              checked={mode === 'other'}
              onChange={() => setMode('other')}
            />
            其他（自己填姓名）
          </label>
        </div>

        {mode === 'present' ? (
          <label className="tb-label" htmlFor={`${idPrefix}-person`}>
            已簽到的人（{people.length}）
            <select
              id={`${idPrefix}-person`}
              name="participationId"
              className="tb-select"
              defaultValue={keepCurrent ? KEEP_WINNER : currentId ?? ''}
              required
            >
              <option value="">請選擇得主</option>
              {keepCurrent && award && currentId ? (
                <option value={KEEP_WINNER}>
                  {award.winnerName}（目前得主・{winnerKindLabel(award.winnerKind)}）
                </option>
              ) : null}
              {people.map((person) => (
                <option key={`${person.participationId}:${person.kind}`} value={person.participationId}>
                  {personOptionLabel(person)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="tb-label" htmlFor={`${idPrefix}-name`}>
            得主姓名
            <input
              id={`${idPrefix}-name`}
              name="winnerName"
              className="tb-input"
              defaultValue={award && !currentId ? award.winnerName : ''}
              maxLength={80}
              autoComplete="off"
              required
              placeholder="例：代領的同事、沒有簽到的來賓"
            />
          </label>
        )}
        {!hasChoices ? <p className="text-xs text-tb-faint">目前還沒有人簽到，所以只能自己填姓名。</p> : null}
      </fieldset>

      <label className="tb-label" htmlFor={`${idPrefix}-note`}>
        備註（選填）
        <input
          id={`${idPrefix}-note`}
          name="note"
          className="tb-input"
          defaultValue={award?.note ?? ''}
          maxLength={300}
          autoComplete="off"
          placeholder="例：原得主不在場，改給下一位"
        />
      </label>
    </>
  );
}

export function AssignAwardDialog({
  eventKey,
  giftId,
  giftName,
  people,
}: {
  eventKey: string;
  giftId: string;
  giftName: string;
  people: PersonOption[];
}) {
  return (
    <DialogButton label="指定得主" title={`指定得主：${giftName}`} className="tb-btn-sm">
      {(close) => (
        <ActionForm action={assignAwardAction} className="flex flex-col gap-3" onSuccess={close}>
          <input type="hidden" name="eventKey" value={eventKey} />
          <input type="hidden" name="giftId" value={giftId} />
          <WinnerFields idPrefix={`assign-${giftId}`} people={people} />
          <div className="flex justify-end">
            <SubmitButton>指定這位得主</SubmitButton>
          </div>
        </ActionForm>
      )}
    </DialogButton>
  );
}

export function EditAwardDialog({
  eventKey,
  giftName,
  award,
  people,
}: {
  eventKey: string;
  giftName: string;
  award: AwardFormValue;
  people: PersonOption[];
}) {
  return (
    <DialogButton label="改得主" title={`改得主：${giftName}`} className="tb-btn-sm">
      {(close) => (
        <ActionForm action={updateAwardAction} className="flex flex-col gap-3" onSuccess={close}>
          <input type="hidden" name="eventKey" value={eventKey} />
          <input type="hidden" name="awardId" value={award.id} />
          <p className="text-sm text-tb-muted">
            目前得主：<span className="font-bold text-tb-text">{award.winnerName}</span>
            。修改會留下紀錄。
          </p>
          <WinnerFields idPrefix={`award-${award.id}`} people={people} award={award} />
          <div className="flex justify-end">
            <SubmitButton>儲存得主</SubmitButton>
          </div>
        </ActionForm>
      )}
    </DialogButton>
  );
}
