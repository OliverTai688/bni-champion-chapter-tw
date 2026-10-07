'use client';

import { useState } from 'react';
import { ActionForm, DialogButton, SubmitButton } from '@/components/tbx/client';
import { STATUS_LABEL, type ParticipationStatusKey } from '@/lib/tbx/labels';
import { EVENT_DUTIES } from '@/lib/tbx/roles';
import { addGuestAction, updateGuestAction, updateParticipationAction } from './actions';

export interface MemberOption {
  id: string;
  name: string;
}

export interface AttendanceRowData {
  id: string;
  displayName: string;
  status: ParticipationStatusKey;
  substituteName: string | null;
  substituteArrived: boolean;
  note: string | null;
  /** Duty keys held at this event (`Participation.roles`). */
  duties: string[];
}

const MEMBER_STATUSES: ParticipationStatusKey[] = ['expected', 'present', 'late', 'substitute', 'absent', 'medical'];

export function EditAttendanceButton({ eventKey, row }: { eventKey: string; row: AttendanceRowData }) {
  const [status, setStatus] = useState<ParticipationStatusKey>(row.status);

  return (
    <DialogButton label="編輯" title={`編輯出席：${row.displayName}`} className="tb-btn-sm">
      {(close) => (
        <ActionForm action={updateParticipationAction} className="flex flex-col gap-3" onSuccess={close}>
          <input type="hidden" name="eventKey" value={eventKey} />
          <input type="hidden" name="participationId" value={row.id} />
          <label className="tb-label" htmlFor={`status-${row.id}`}>
            出席狀態
            <select
              id={`status-${row.id}`}
              name="status"
              className="tb-select"
              value={status}
              onChange={(event) => setStatus(event.target.value as ParticipationStatusKey)}
            >
              {MEMBER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          {status === 'substitute' ? (
            <>
              <label className="tb-label" htmlFor={`sub-${row.id}`}>
                代理人姓名
                <input
                  id={`sub-${row.id}`}
                  name="substituteName"
                  className="tb-input"
                  defaultValue={row.substituteName ?? ''}
                  maxLength={40}
                  required
                />
              </label>
              <label className="flex items-center gap-2 text-sm" htmlFor={`sub-arrived-${row.id}`}>
                <input id={`sub-arrived-${row.id}`} name="substituteArrived" type="checkbox" defaultChecked={row.substituteArrived} />
                代理人已到場
              </label>
            </>
          ) : null}
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="tb-label p-0">本場任務（可複選）</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {EVENT_DUTIES.map((duty) => (
                <label key={duty.key} className="flex items-center gap-2 text-sm" htmlFor={`duty-${duty.key}-${row.id}`}>
                  <input
                    id={`duty-${duty.key}-${row.id}`}
                    name="duties"
                    type="checkbox"
                    value={duty.key}
                    defaultChecked={row.duties.includes(duty.key)}
                  />
                  {duty.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="tb-label" htmlFor={`note-${row.id}`}>
            備註
            <input id={`note-${row.id}`} name="note" className="tb-input" defaultValue={row.note ?? ''} maxLength={120} />
          </label>
          <SubmitButton>儲存</SubmitButton>
        </ActionForm>
      )}
    </DialogButton>
  );
}

export interface GuestData {
  id: string;
  displayName: string;
  guestIndustry: string | null;
  guestCompany: string | null;
  hostMemberId: string | null;
  invitedByMemberId: string | null;
  note: string | null;
}

function GuestFields({ prefix, members, guest }: { prefix: string; members: MemberOption[]; guest?: GuestData }) {
  return (
    <>
      <label className="tb-label" htmlFor={`${prefix}-name`}>
        來賓姓名
        <input id={`${prefix}-name`} name="displayName" className="tb-input" defaultValue={guest?.displayName} maxLength={40} required />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="tb-label" htmlFor={`${prefix}-industry`}>
          產業
          <input id={`${prefix}-industry`} name="guestIndustry" className="tb-input" defaultValue={guest?.guestIndustry ?? ''} maxLength={40} />
        </label>
        <label className="tb-label" htmlFor={`${prefix}-company`}>
          公司
          <input id={`${prefix}-company`} name="guestCompany" className="tb-input" defaultValue={guest?.guestCompany ?? ''} maxLength={60} />
        </label>
        <label className="tb-label" htmlFor={`${prefix}-invited`}>
          邀請人
          <select id={`${prefix}-invited`} name="invitedByMemberId" className="tb-select" defaultValue={guest?.invitedByMemberId ?? ''}>
            <option value="">未指定</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="tb-label" htmlFor={`${prefix}-host`}>
          接待執事
          <select id={`${prefix}-host`} name="hostMemberId" className="tb-select" defaultValue={guest?.hostMemberId ?? ''}>
            <option value="">未指定</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="tb-label" htmlFor={`${prefix}-note`}>
        備註
        <input id={`${prefix}-note`} name="note" className="tb-input" defaultValue={guest?.note ?? ''} maxLength={120} />
      </label>
    </>
  );
}

export function AddGuestButton({ eventKey, members }: { eventKey: string; members: MemberOption[] }) {
  return (
    <DialogButton label="新增來賓" title="新增來賓" className="tb-btn-gold">
      {(close) => (
        <ActionForm action={addGuestAction} className="flex flex-col gap-3" onSuccess={close}>
          <input type="hidden" name="eventKey" value={eventKey} />
          <GuestFields prefix="new-guest" members={members} />
          <label className="flex items-center gap-2 text-sm" htmlFor="new-guest-arrived">
            <input id="new-guest-arrived" name="arrived" type="checkbox" />
            已經到場，直接簽到
          </label>
          <SubmitButton>新增來賓</SubmitButton>
        </ActionForm>
      )}
    </DialogButton>
  );
}

export function EditGuestButton({ eventKey, members, guest }: { eventKey: string; members: MemberOption[]; guest: GuestData }) {
  return (
    <DialogButton label="編輯" title={`編輯來賓：${guest.displayName}`} className="tb-btn-sm">
      {(close) => (
        <ActionForm action={updateGuestAction} className="flex flex-col gap-3" onSuccess={close}>
          <input type="hidden" name="eventKey" value={eventKey} />
          <input type="hidden" name="participationId" value={guest.id} />
          <GuestFields prefix={`guest-${guest.id}`} members={members} guest={guest} />
          <SubmitButton>儲存</SubmitButton>
        </ActionForm>
      )}
    </DialogButton>
  );
}
