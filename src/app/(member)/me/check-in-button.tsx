'use client';

import { useRouter } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { memberCheckInAction } from './actions';

/** `seatMapHref`: the day's public seat map to open after checking in (only when the event is published). */
export function MemberCheckInButton({ eventKey, seatMapHref }: { eventKey: string; seatMapHref?: string | null }) {
  const router = useRouter();
  return (
    <ActionForm
      action={memberCheckInAction}
      className="flex flex-col gap-2"
      onSuccess={() => {
        if (!seatMapHref) return;
        router.prefetch(seatMapHref);
        window.setTimeout(() => router.push(seatMapHref), 1200);
      }}
    >
      <input type="hidden" name="eventKey" value={eventKey} />
      <SubmitButton className="tb-btn-lg w-full" pendingText="簽到中…">
        我到了，簽到
      </SubmitButton>
    </ActionForm>
  );
}
