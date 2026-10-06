'use client';

import { ActionForm, DialogButton, SubmitButton } from '@/components/tbx/client';
import { createEventAction, updateEventAction } from './actions';

const TYPES = [
  { value: 'weekly_meeting', label: '每週例會' },
  { value: 'activity', label: '活動' },
  { value: 'training', label: '培訓' },
  { value: 'social', label: '聯誼' },
];

function Fields({
  prefix,
  defaults,
  withDate,
}: {
  prefix: string;
  defaults?: { title?: string; eventType?: string | null; location?: string | null; startsAt?: string | null; date?: string };
  withDate?: boolean;
}) {
  return (
    <>
      {withDate ? (
        <label className="tb-label" htmlFor={`${prefix}-date`}>
          日期
          <input id={`${prefix}-date`} name="date" type="date" className="tb-input" defaultValue={defaults?.date} required />
        </label>
      ) : null}
      <label className="tb-label" htmlFor={`${prefix}-type`}>
        類型
        <select id={`${prefix}-type`} name="eventType" className="tb-select" defaultValue={defaults?.eventType ?? 'weekly_meeting'}>
          {TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label className="tb-label" htmlFor={`${prefix}-title`}>
        名稱{withDate ? '（留空會用日期自動命名）' : ''}
        <input id={`${prefix}-title`} name="title" className="tb-input" defaultValue={defaults?.title} maxLength={60} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="tb-label" htmlFor={`${prefix}-starts`}>
          開始時間
          <input id={`${prefix}-starts`} name="startsAt" type="time" className="tb-input" defaultValue={defaults?.startsAt ?? '07:00'} />
        </label>
        <label className="tb-label" htmlFor={`${prefix}-location`}>
          地點
          <input id={`${prefix}-location`} name="location" className="tb-input" defaultValue={defaults?.location ?? ''} maxLength={80} />
        </label>
      </div>
    </>
  );
}

export function CreateEventButton({ defaultDate }: { defaultDate: string }) {
  return (
    <DialogButton label="新增活動" title="新增活動" className="tb-btn-gold">
      {() => (
        <ActionForm action={createEventAction} className="flex flex-col gap-3">
          <Fields prefix="new-event" withDate defaults={{ date: defaultDate }} />
          <SubmitButton>建立活動</SubmitButton>
        </ActionForm>
      )}
    </DialogButton>
  );
}

export function EditEventButton({
  event,
}: {
  event: { weekId: string; title: string; eventType: string | null; location: string | null; startsAt: string | null };
}) {
  return (
    <DialogButton label="編輯" title="編輯活動" className="tb-btn-sm">
      {(close) => (
        <ActionForm action={updateEventAction} className="flex flex-col gap-3" onSuccess={close}>
          <input type="hidden" name="eventKey" value={event.weekId} />
          <Fields prefix={`edit-${event.weekId}`} defaults={event} />
          <SubmitButton>儲存</SubmitButton>
        </ActionForm>
      )}
    </DialogButton>
  );
}
