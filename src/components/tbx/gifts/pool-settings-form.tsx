'use client';

import { saveLotterySettingsAction } from '@/app/(console)/console/events/[eventKey]/gifts/actions';
import { ActionForm, SubmitButton } from '@/components/tbx/client';

export interface PoolSettingsValue {
  includeMembers: boolean;
  includeGuests: boolean;
  includeSubstitutes: boolean;
  excludeWinners: boolean;
}

const OPTIONS: Array<{ key: keyof PoolSettingsValue; label: string; hint: string }> = [
  { key: 'includeMembers', label: '已簽到的會員', hint: '含遲到的會員' },
  { key: 'includeGuests', label: '已簽到的來賓', hint: '' },
  { key: 'includeSubstitutes', label: '已到場的代理人', hint: '' },
  { key: 'excludeWinners', label: '排除本場已中獎的人', hint: '每人最多拿一份' },
];

export function PoolSettingsForm({ eventKey, settings }: { eventKey: string; settings: PoolSettingsValue }) {
  return (
    <ActionForm action={saveLotterySettingsAction} className="flex flex-col gap-3">
      <input type="hidden" name="eventKey" value={eventKey} />
      <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
        <legend className="mb-1 p-0 text-xs font-semibold text-tb-muted">誰可以被抽到</legend>
        {OPTIONS.map((option) => (
          <label key={option.key} className="flex min-h-[36px] items-center gap-2 text-sm" htmlFor={`pool-${option.key}`}>
            <input
              id={`pool-${option.key}`}
              type="checkbox"
              name={option.key}
              defaultChecked={settings[option.key]}
              className="h-4 w-4 shrink-0"
            />
            <span>
              {option.label}
              {option.hint ? <span className="ml-2 text-xs text-tb-faint">{option.hint}</span> : null}
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <SubmitButton className="tb-btn-sm">儲存抽獎池設定</SubmitButton>
      </div>
    </ActionForm>
  );
}
