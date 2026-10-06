'use client';

import { Pencil, UserPlus } from 'lucide-react';
import { createMemberAction, updateMemberAction } from '@/app/(console)/console/members/actions';
import { DialogButton } from '@/components/tbx/client';
import { KeepValuesForm } from '@/components/tbx/members/keep-values-form';
import type { MemberFormValues } from '@/components/tbx/members/member-values';
import { cn } from '@/lib/utils';

function MemberFields({
  idPrefix,
  values,
  groups,
  showActive,
}: {
  idPrefix: string;
  values?: MemberFormValues;
  groups: string[];
  showActive: boolean;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="tb-label" htmlFor={id('name')}>
          姓名
          <input
            id={id('name')}
            name="displayName"
            className="tb-input"
            defaultValue={values?.displayName}
            maxLength={40}
            required
            autoComplete="off"
          />
        </label>
        <label className="tb-label" htmlFor={id('group')}>
          行政分組
          <input
            id={id('group')}
            name="adminGroup"
            className="tb-input"
            defaultValue={values?.adminGroup}
            maxLength={20}
            list={id('group-options')}
            placeholder="例如 第 1 組"
            autoComplete="off"
          />
          <datalist id={id('group-options')}>
            {groups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </label>
        <label className="tb-label" htmlFor={id('industry')}>
          產業
          <input id={id('industry')} name="industry" className="tb-input" defaultValue={values?.industry} maxLength={60} />
        </label>
        <label className="tb-label" htmlFor={id('company')}>
          公司
          <input id={id('company')} name="company" className="tb-input" defaultValue={values?.company} maxLength={80} />
        </label>
        <label className="tb-label" htmlFor={id('phone')}>
          電話
          <input
            id={id('phone')}
            name="phone"
            type="tel"
            inputMode="tel"
            className="tb-input"
            defaultValue={values?.phone}
            maxLength={30}
            autoComplete="off"
          />
        </label>
        <label className="tb-label" htmlFor={id('email')}>
          Email
          <input
            id={id('email')}
            name="email"
            type="email"
            className="tb-input"
            defaultValue={values?.email}
            maxLength={120}
            autoComplete="off"
          />
        </label>
        <label className="tb-label" htmlFor={id('joined')}>
          入會日期
          <input id={id('joined')} name="joinedAt" type="date" className="tb-input" defaultValue={values?.joinedAt} />
        </label>
        <label className="tb-label" htmlFor={id('roles')}>
          角色標籤（用逗號分隔）
          <input
            id={id('roles')}
            name="roles"
            className="tb-input"
            defaultValue={values?.roles.join('、')}
            placeholder="例如 導師、執事"
            autoComplete="off"
          />
        </label>
      </div>
      <label className="tb-label" htmlFor={id('aliases')}>
        別名（用逗號分隔，匯入 PALMS 或對名時會用到）
        <input
          id={id('aliases')}
          name="aliases"
          className="tb-input"
          defaultValue={values?.aliases.join('、')}
          placeholder="例如 本名、英文名"
          autoComplete="off"
        />
      </label>
      <label className="tb-label" htmlFor={id('intro')}>
        自我介紹（最多 300 字）
        <textarea id={id('intro')} name="intro" className="tb-textarea" rows={3} defaultValue={values?.intro} maxLength={300} />
      </label>
      <label className="tb-label" htmlFor={id('target')}>
        目標客戶（最多 300 字）
        <textarea
          id={id('target')}
          name="targetCustomers"
          className="tb-textarea"
          rows={3}
          defaultValue={values?.targetCustomers}
          maxLength={300}
        />
      </label>
      <label className="tb-label" htmlFor={id('note')}>
        備註（只有領導團隊看得到）
        <textarea id={id('note')} name="note" className="tb-textarea" rows={2} defaultValue={values?.note} maxLength={500} />
      </label>
      {showActive ? (
        <label className="flex min-h-[44px] items-center gap-2 text-sm text-tb-text" htmlFor={id('active')}>
          <input type="hidden" name="isActivePresent" value="1" />
          <input
            id={id('active')}
            name="isActive"
            type="checkbox"
            className="h-4 w-4 accent-[var(--tb-gold)]"
            defaultChecked={values?.isActive ?? true}
          />
          在籍（取消勾選就是停用，資料與紀錄都會保留）
        </label>
      ) : null}
    </>
  );
}

export function NewMemberButton({ groups }: { groups: string[] }) {
  return (
    <DialogButton
      title="新增會員"
      className="tb-btn-gold"
      label={
        <>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          新增會員
        </>
      }
    >
      {(close) => (
        <KeepValuesForm action={createMemberAction} className="flex flex-col gap-3" submitLabel="新增會員" onSuccess={close}>
          <MemberFields idPrefix="member-new" groups={groups} showActive={false} />
        </KeepValuesForm>
      )}
    </DialogButton>
  );
}

export function EditMemberButton({
  member,
  groups,
  className,
  label = '編輯',
  size = 'sm',
}: {
  member: MemberFormValues;
  groups: string[];
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <DialogButton
      title={`編輯 ${member.displayName}`}
      className={cn(size === 'sm' && 'tb-btn-sm', className)}
      label={
        <>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </>
      }
    >
      {(close) => (
        <KeepValuesForm action={updateMemberAction} className="flex flex-col gap-3" submitLabel="儲存會員資料" onSuccess={close}>
          <input type="hidden" name="memberId" value={member.id} />
          <MemberFields idPrefix={`member-${member.id}`} values={member} groups={groups} showActive />
        </KeepValuesForm>
      )}
    </DialogButton>
  );
}
