'use client';

import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { setEventPublishedAction } from '../actions';

export function PublishControls({ eventKey, published }: { eventKey: string; published: boolean }) {
  return (
    <ActionForm action={setEventPublishedAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="eventKey" value={eventKey} />
      <input type="hidden" name="publish" value={published ? '0' : '1'} />
      {published ? (
        <button type="submit" className="tb-btn tb-btn-sm">
          取消發布
        </button>
      ) : (
        <SubmitButton pendingText="發布中…">發布活動</SubmitButton>
      )}
    </ActionForm>
  );
}
