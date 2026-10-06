'use client';

import { useMemo, useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { bindLineAction } from './actions';

export function LineBinding({ members, next }: { members: Array<{ id: string; name: string; group: string | null }>; next: string }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const value = query.trim();
    return value ? members.filter((member) => member.name.includes(value)) : members;
  }, [members, query]);
  const selectedMember = members.find((member) => member.id === selected);

  return (
    <ActionForm action={bindLineAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="memberId" value={selected ?? ''} />
      <label className="tb-label" htmlFor="line-member-search">
        找你的姓名
        <input
          id="line-member-search"
          className="tb-input h-12 text-base"
          placeholder="輸入姓名"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="選擇你的姓名">
        {filtered.map((member) => (
          <button
            key={member.id}
            type="button"
            role="radio"
            aria-checked={selected === member.id}
            onClick={() => setSelected(member.id)}
            className={selected === member.id ? 'tb-btn tb-btn-gold min-h-[48px]' : 'tb-btn min-h-[48px]'}
          >
            {member.name}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <p className="text-sm text-tb-muted">找不到這個姓名。如果你已經被別的 LINE 帳號綁定，請聯絡幹部解除。</p> : null}
      <SubmitButton className="tb-btn-lg w-full" disabled={!selected} pendingText="綁定中…">
        {selectedMember ? `我是 ${selectedMember.name}，綁定這個 LINE` : '先選擇你的姓名'}
      </SubmitButton>
    </ActionForm>
  );
}
