'use client';

import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { memberCheckInAction } from './actions';

export function MemberCheckInButton({ eventKey }: { eventKey: string }) {
  return (
    <ActionForm action={memberCheckInAction} className="flex flex-col gap-2">
      <input type="hidden" name="eventKey" value={eventKey} />
      <SubmitButton className="tb-btn-lg w-full" pendingText="簽到中…">
        我到了，簽到
      </SubmitButton>
    </ActionForm>
  );
}
