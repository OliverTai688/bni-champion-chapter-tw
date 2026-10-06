'use client';

import { useMemo, useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { guestCheckInAction, selfCheckInAction, substituteCheckInAction } from './actions';

export interface CheckInPerson {
  id: string;
  name: string;
  /** expected | arrived | away (leave) | substitute (waiting) */
  state: 'expected' | 'arrived' | 'away' | 'substitute';
  substituteName: string | null;
}

type Mode = 'member' | 'substitute' | 'guest';

const MODES: Array<{ key: Mode; label: string }> = [
  { key: 'member', label: '我是會員' },
  { key: 'substitute', label: '我是代理人' },
  { key: 'guest', label: '我是來賓' },
];

function NameGrid({
  people,
  selected,
  onSelect,
  renderHint,
}: {
  people: CheckInPerson[];
  selected: string | null;
  onSelect: (id: string) => void;
  renderHint?: (person: CheckInPerson) => string | null;
}) {
  if (people.length === 0) return <p className="text-sm text-tb-muted">找不到這個姓名。</p>;
  return (
    <div className="grid max-h-[42vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3" role="listbox" aria-label="名單">
      {people.map((person) => {
        const hint = renderHint?.(person) ?? null;
        return (
          <button
            key={person.id}
            type="button"
            role="option"
            aria-selected={selected === person.id}
            onClick={() => onSelect(person.id)}
            className="flex min-h-[52px] flex-col items-start justify-center rounded-xl border border-tb-line bg-tb-surf px-3 text-left text-tb-text aria-selected:border-tb-gold aria-selected:bg-tb-gold-soft"
          >
            <span className="text-[15px] font-bold">{person.name}</span>
            {hint ? <span className="text-[11px] text-tb-faint">{hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function CheckInClient({
  eventKey,
  members,
  guests,
  inviters,
  myParticipationId,
}: {
  eventKey: string;
  members: CheckInPerson[];
  guests: CheckInPerson[];
  inviters: Array<{ id: string; name: string }>;
  myParticipationId: string | null;
}) {
  const [mode, setMode] = useState<Mode>('member');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(myParticipationId);
  const [substituteName, setSubstituteName] = useState('');

  const filteredMembers = useMemo(() => {
    const value = query.trim();
    return value ? members.filter((person) => person.name.includes(value)) : members;
  }, [members, query]);
  const waitingGuests = guests.filter((guest) => guest.state === 'expected');
  const selectedPerson = [...members, ...guests].find((person) => person.id === selected) ?? null;

  function switchMode(next: Mode) {
    setMode(next);
    setSelected(next === 'member' ? myParticipationId : null);
    setQuery('');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="簽到身份">
        {MODES.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={mode === item.key}
            onClick={() => switchMode(item.key)}
            className="min-h-[48px] rounded-xl border border-tb-line bg-tb-surf text-[15px] font-bold text-tb-muted aria-selected:border-tb-gold aria-selected:bg-tb-gold-soft aria-selected:text-tb-gold"
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode !== 'guest' ? (
        <label className="tb-label" htmlFor="check-in-search">
          {mode === 'member' ? '找你的姓名' : '你代理哪一位會員'}
          <input
            id="check-in-search"
            className="tb-input h-12 text-base"
            placeholder="輸入姓名"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </label>
      ) : null}

      {mode === 'member' ? (
        <ActionForm action={selfCheckInAction} className="flex flex-col gap-4">
          <input type="hidden" name="eventKey" value={eventKey} />
          <input type="hidden" name="participationId" value={selected ?? ''} />
          <NameGrid
            people={filteredMembers}
            selected={selected}
            onSelect={setSelected}
            renderHint={(person) =>
              person.state === 'arrived' ? '已簽到' : person.state === 'away' ? '已請假' : person.state === 'substitute' ? '已登記代理' : null
            }
          />
          <SubmitButton className="tb-btn-lg" disabled={!selectedPerson}>
            {selectedPerson ? `我是 ${selectedPerson.name}，簽到` : '先選擇你的姓名'}
          </SubmitButton>
        </ActionForm>
      ) : null}

      {mode === 'substitute' ? (
        <ActionForm action={substituteCheckInAction} className="flex flex-col gap-4">
          <input type="hidden" name="eventKey" value={eventKey} />
          <input type="hidden" name="participationId" value={selected ?? ''} />
          <NameGrid
            people={[...filteredMembers].sort((a, b) => Number(b.state === 'substitute') - Number(a.state === 'substitute'))}
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
              const person = members.find((item) => item.id === id);
              setSubstituteName(person?.substituteName ?? '');
            }}
            renderHint={(person) =>
              person.state === 'substitute' ? `登記代理人：${person.substituteName ?? ''}` : person.state === 'arrived' ? '本人已簽到' : null
            }
          />
          <label className="tb-label" htmlFor="check-in-substitute-name">
            你的姓名
            <input
              id="check-in-substitute-name"
              name="substituteName"
              className="tb-input h-12 text-base"
              value={substituteName}
              onChange={(event) => setSubstituteName(event.target.value)}
              maxLength={40}
              required
            />
          </label>
          <SubmitButton className="tb-btn-lg" disabled={!selectedPerson || !substituteName.trim()}>
            {selectedPerson ? `代理 ${selectedPerson.name}，簽到` : '先選擇你代理的會員'}
          </SubmitButton>
        </ActionForm>
      ) : null}

      {mode === 'guest' ? (
        <div className="flex flex-col gap-5">
          {waitingGuests.length > 0 ? (
            <ActionForm action={selfCheckInAction} className="flex flex-col gap-3">
              <input type="hidden" name="eventKey" value={eventKey} />
              <input type="hidden" name="participationId" value={selected ?? ''} />
              <p className="tb-label">已登記的來賓，點你的姓名</p>
              <NameGrid people={waitingGuests} selected={selected} onSelect={setSelected} />
              <SubmitButton className="tb-btn-lg" disabled={!selectedPerson}>
                {selectedPerson ? `我是 ${selectedPerson.name}，簽到` : '選擇你的姓名'}
              </SubmitButton>
            </ActionForm>
          ) : null}

          <ActionForm action={guestCheckInAction} className="tb-card flex flex-col gap-3 p-4" resetOnSuccess>
            <input type="hidden" name="eventKey" value={eventKey} />
            <p className="font-bold">{waitingGuests.length > 0 ? '名單上沒有我' : '來賓登記'}</p>
            <label className="tb-label" htmlFor="guest-name">
              姓名
              <input id="guest-name" name="displayName" className="tb-input h-12 text-base" maxLength={40} required />
            </label>
            <label className="tb-label" htmlFor="guest-industry">
              產業（選填）
              <input id="guest-industry" name="guestIndustry" className="tb-input" maxLength={40} />
            </label>
            <label className="tb-label" htmlFor="guest-company">
              公司（選填）
              <input id="guest-company" name="guestCompany" className="tb-input" maxLength={60} />
            </label>
            <label className="tb-label" htmlFor="guest-invited">
              誰邀請你（選填）
              <select id="guest-invited" name="invitedByMemberId" className="tb-select" defaultValue="">
                <option value="">不確定</option>
                {inviters.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton className="tb-btn-lg">登記並簽到</SubmitButton>
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
