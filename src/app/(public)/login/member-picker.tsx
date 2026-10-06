'use client';

import { useMemo, useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { chooseMemberAction } from './actions';

export function MemberPicker({ members, next }: { members: Array<{ id: string; name: string; group: string | null }>; next: string }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const value = query.trim();
    return value ? members.filter((member) => member.name.includes(value)) : members;
  }, [members, query]);
  const selectedMember = members.find((member) => member.id === selected);

  return (
    <ActionForm action={chooseMemberAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="memberId" value={selected ?? ''} />
      <label className="tb-label" htmlFor="member-search">
        找你的姓名
        <input
          id="member-search"
          className="tb-input h-12 text-base"
          placeholder="輸入姓名"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
      </label>
      <div className="grid max-h-[46vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3" role="listbox" aria-label="會員名單">
        {filtered.map((member) => (
          <button
            key={member.id}
            type="button"
            role="option"
            aria-selected={selected === member.id}
            onClick={() => setSelected(member.id)}
            className="flex min-h-[52px] flex-col items-start justify-center rounded-xl border border-tb-line bg-tb-surf px-3 text-left text-tb-text aria-selected:border-tb-gold aria-selected:bg-tb-gold-soft"
          >
            <span className="text-[15px] font-bold">{member.name}</span>
            {member.group ? <span className="text-[11px] text-tb-faint">{member.group}</span> : null}
          </button>
        ))}
        {filtered.length === 0 ? <p className="col-span-full text-sm text-tb-muted">找不到這個姓名。請確認用的是名冊上的姓名。</p> : null}
      </div>
      <SubmitButton className="tb-btn-lg" disabled={!selected}>
        {selectedMember ? `我是 ${selectedMember.name}，進入會員區` : '先選擇你的姓名'}
      </SubmitButton>
    </ActionForm>
  );
}
