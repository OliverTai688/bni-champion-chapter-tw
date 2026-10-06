'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { createRoleTermAction, updateRoleTermAction } from '@/app/(console)/console/settings/roles/actions';
import { DialogButton } from '@/components/tbx/client';
import { KeepValuesForm } from '@/components/tbx/members/keep-values-form';
import { LEADERSHIP_ROLES } from '@/lib/tbx/labels';

export interface RoleTermMemberOption {
  id: string;
  displayName: string;
  adminGroup: string | null;
  /** False for a past member who still has a term on record. */
  isActive: boolean;
}

/** Dates are YYYY-MM-DD in Taiwan time. */
export interface RoleTermFormValues {
  id: string;
  memberId: string;
  role: string;
  startsOn: string;
  endsOn: string;
  note: string;
}

const OTHER = '__other__';

function RoleTermFields({
  idPrefix,
  members,
  values,
  defaultStartsOn,
}: {
  idPrefix: string;
  members: RoleTermMemberOption[];
  values?: RoleTermFormValues;
  defaultStartsOn: string;
}) {
  const isStandard = values ? (LEADERSHIP_ROLES as readonly string[]).includes(values.role) : true;
  const [choice, setChoice] = useState(values ? (isStandard ? values.role : OTHER) : '');
  const [custom, setCustom] = useState(values && !isStandard ? values.role : '');
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <label className="tb-label" htmlFor={id('member')}>
        會員
        <select id={id('member')} name="memberId" className="tb-select" defaultValue={values?.memberId ?? ''} required>
          <option value="" disabled>
            請選擇會員
          </option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
              {member.adminGroup ? `（${member.adminGroup}）` : ''}
              {member.isActive ? '' : '（已停用）'}
            </option>
          ))}
        </select>
      </label>

      <label className="tb-label" htmlFor={id('role')}>
        職位
        <select
          id={id('role')}
          className="tb-select"
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          required
        >
          <option value="" disabled>
            請選擇職位
          </option>
          {LEADERSHIP_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
          <option value={OTHER}>其他（自行輸入）</option>
        </select>
      </label>
      {choice === OTHER ? (
        <label className="tb-label" htmlFor={id('role-other')}>
          職位名稱
          <input
            id={id('role-other')}
            className="tb-input"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            maxLength={30}
            placeholder="例如 公關協調"
            required
            autoComplete="off"
          />
        </label>
      ) : null}
      {/* The server reads only this resolved value. */}
      <input type="hidden" name="role" value={choice === OTHER ? custom.trim() : choice} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="tb-label" htmlFor={id('starts')}>
          開始日期
          <input
            id={id('starts')}
            name="startsAt"
            type="date"
            className="tb-input"
            defaultValue={values?.startsOn ?? defaultStartsOn}
            required
          />
        </label>
        <label className="tb-label" htmlFor={id('ends')}>
          結束日期（還沒確定就留空）
          <input id={id('ends')} name="endsAt" type="date" className="tb-input" defaultValue={values?.endsOn} />
        </label>
      </div>
      <label className="tb-label" htmlFor={id('note')}>
        備註
        <input
          id={id('note')}
          name="note"
          className="tb-input"
          defaultValue={values?.note}
          maxLength={200}
          placeholder="例如 第 12 屆、代理到年底"
          autoComplete="off"
        />
      </label>
    </>
  );
}

export function NewRoleTermButton({ members, today }: { members: RoleTermMemberOption[]; today: string }) {
  return (
    <DialogButton
      title="新增任期"
      className="tb-btn-gold"
      label={
        <>
          <Plus className="h-4 w-4" aria-hidden="true" />
          新增任期
        </>
      }
    >
      {(close) => (
        <KeepValuesForm action={createRoleTermAction} className="flex flex-col gap-3" submitLabel="新增任期" onSuccess={close}>
          <RoleTermFields idPrefix="role-term-new" members={members} defaultStartsOn={today} />
        </KeepValuesForm>
      )}
    </DialogButton>
  );
}

export function EditRoleTermButton({
  term,
  members,
  today,
}: {
  term: RoleTermFormValues;
  members: RoleTermMemberOption[];
  today: string;
}) {
  return (
    <DialogButton
      title="編輯任期"
      className="tb-btn-sm"
      label={
        <>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          編輯
        </>
      }
    >
      {(close) => (
        <KeepValuesForm action={updateRoleTermAction} className="flex flex-col gap-3" submitLabel="儲存任期" onSuccess={close}>
          <input type="hidden" name="termId" value={term.id} />
          <RoleTermFields idPrefix={`role-term-${term.id}`} members={members} values={term} defaultStartsOn={today} />
        </KeepValuesForm>
      )}
    </DialogButton>
  );
}
