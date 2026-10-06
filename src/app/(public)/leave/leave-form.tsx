'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { registerLeaveAction } from './actions';

export interface LeaveEventOption {
  key: string;
  label: string;
}

const CHOICES = [
  { value: 'substitute', label: '找代理' },
  { value: 'absent', label: '請假' },
  { value: 'present', label: '會出席' },
] as const;

export function LeaveForm({
  events,
  members,
  me,
  defaultEventKey,
  defaultChoice = 'substitute',
  defaultSubstitute = '',
}: {
  events: LeaveEventOption[];
  members: Array<{ id: string; name: string }>;
  me: { id: string; name: string } | null;
  defaultEventKey?: string;
  defaultChoice?: 'substitute' | 'absent' | 'present';
  defaultSubstitute?: string;
}) {
  const [choice, setChoice] = useState<string>(defaultChoice);

  return (
    <ActionForm action={registerLeaveAction} className="flex flex-col gap-4">
      <label className="tb-label" htmlFor="leave-event">
        哪一場活動
        <select id="leave-event" name="eventKey" className="tb-select h-12 text-base" defaultValue={defaultEventKey ?? events[0]?.key} required>
          {events.map((event) => (
            <option key={event.key} value={event.key}>
              {event.label}
            </option>
          ))}
        </select>
      </label>

      {me ? (
        <p className="text-sm text-tb-muted">
          登記人：<b className="text-tb-text">{me.name}</b>
        </p>
      ) : (
        <label className="tb-label" htmlFor="leave-member">
          你的姓名
          <select id="leave-member" name="memberId" className="tb-select h-12 text-base" defaultValue="" required>
            <option value="" disabled>
              請選擇
            </option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="tb-label mb-1">這一場你會</legend>
        <div className="grid grid-cols-3 gap-2">
          {CHOICES.map((item) => (
            <label
              key={item.value}
              htmlFor={`leave-choice-${item.value}`}
              className={`flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border text-[15px] font-bold ${
                choice === item.value ? 'border-tb-gold bg-tb-gold-soft text-tb-gold' : 'border-tb-line bg-tb-surf text-tb-muted'
              }`}
            >
              <input
                id={`leave-choice-${item.value}`}
                type="radio"
                name="choice"
                value={item.value}
                checked={choice === item.value}
                onChange={() => setChoice(item.value)}
                className="sr-only"
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      {choice === 'substitute' ? (
        <label className="tb-label" htmlFor="leave-substitute">
          代理人姓名
          <input
            id="leave-substitute"
            name="substituteName"
            className="tb-input h-12 text-base"
            placeholder="例如：王大同"
            defaultValue={defaultSubstitute}
            maxLength={40}
            required
          />
        </label>
      ) : null}

      <SubmitButton className="tb-btn-lg">送出登記</SubmitButton>
    </ActionForm>
  );
}
