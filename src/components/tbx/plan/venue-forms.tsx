'use client';

import { useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Pencil, Plus } from 'lucide-react';
import {
  createLayoutAction,
  createVenueAction,
  renameLayoutAction,
  updateVenueAction,
} from '@/app/(console)/console/venues/actions';
import { ActionForm, DialogButton, SubmitButton } from '@/components/tbx/client';
import { LAYOUT_KINDS, LAYOUT_KIND_LABEL, type LayoutKind } from '@/lib/tbx/plan';
import { cn } from '@/lib/utils';

export interface VenueFormValue {
  id: string;
  name: string;
  address: string | null;
  widthM: number;
  heightM: number;
  note: string | null;
}

/** Neutral (not gold) submit button for secondary actions inside an `ActionForm`. */
export function PlainSubmit({
  children,
  pendingText,
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={cn('tb-btn tb-btn-sm', className)} disabled={pending}>
      {pending ? pendingText ?? '處理中…' : children}
    </button>
  );
}

function VenueFields({ prefix, venue }: { prefix: string; venue?: VenueFormValue }) {
  return (
    <>
      <label className="tb-label" htmlFor={`${prefix}-name`}>
        場地名稱
        <input
          id={`${prefix}-name`}
          name="name"
          className="tb-input"
          defaultValue={venue?.name ?? ''}
          maxLength={60}
          placeholder="例：長榮桂冠 3 樓會議廳"
          required
        />
      </label>
      <label className="tb-label" htmlFor={`${prefix}-address`}>
        地址（選填）
        <input id={`${prefix}-address`} name="address" className="tb-input" defaultValue={venue?.address ?? ''} maxLength={120} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="tb-label" htmlFor={`${prefix}-width`}>
          寬度（公尺，面向講台的左右）
          <input
            id={`${prefix}-width`}
            name="widthM"
            type="number"
            className="tb-input"
            defaultValue={venue?.widthM ?? 20}
            min={3}
            max={200}
            step={0.5}
            required
          />
        </label>
        <label className="tb-label" htmlFor={`${prefix}-height`}>
          深度（公尺，講台到後牆）
          <input
            id={`${prefix}-height`}
            name="heightM"
            type="number"
            className="tb-input"
            defaultValue={venue?.heightM ?? 14}
            min={3}
            max={200}
            step={0.5}
            required
          />
        </label>
      </div>
      <label className="tb-label" htmlFor={`${prefix}-note`}>
        備註（選填）
        <textarea
          id={`${prefix}-note`}
          name="note"
          className="tb-textarea"
          rows={2}
          defaultValue={venue?.note ?? ''}
          maxLength={300}
          placeholder="例：後方有兩根柱子，投影幕在講台右側"
        />
      </label>
    </>
  );
}

export function NewVenueDialog() {
  return (
    <DialogButton
      label={
        <>
          <Plus className="h-4 w-4" aria-hidden="true" />
          新增場地
        </>
      }
      title="新增場地"
      className="tb-btn-gold"
    >
      {(close) => (
        <ActionForm action={createVenueAction} className="flex flex-col gap-3" onSuccess={close}>
          <VenueFields prefix="venue-new" />
          <p className="text-xs text-tb-faint">尺寸不用很精準，之後可以再改。建立後到場地頁新增配置。</p>
          <SubmitButton>新增場地</SubmitButton>
        </ActionForm>
      )}
    </DialogButton>
  );
}

export function EditVenueDialog({ venue, className }: { venue: VenueFormValue; className?: string }) {
  return (
    <DialogButton
      label={
        <>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          編輯場地
        </>
      }
      title={`編輯場地：${venue.name}`}
      className={className ?? 'tb-btn-sm'}
    >
      {(close) => (
        <ActionForm action={updateVenueAction} className="flex flex-col gap-3" onSuccess={close}>
          <input type="hidden" name="venueId" value={venue.id} />
          <VenueFields prefix={`venue-${venue.id}`} venue={venue} />
          <p className="text-xs text-tb-faint">改尺寸不會移動既有配置裡的桌椅，超出牆面的物件請到配置編輯器調整。</p>
          <SubmitButton>儲存場地資料</SubmitButton>
        </ActionForm>
      )}
    </DialogButton>
  );
}

export function RenameLayoutDialog({ layoutId, name }: { layoutId: string; name: string }) {
  return (
    <DialogButton label="改名" title={`配置改名：${name}`} className="tb-btn-sm">
      {(close) => (
        <ActionForm action={renameLayoutAction} className="flex flex-col gap-3" onSuccess={close}>
          <input type="hidden" name="layoutId" value={layoutId} />
          <label className="tb-label" htmlFor={`layout-name-${layoutId}`}>
            配置名稱
            <input id={`layout-name-${layoutId}`} name="name" className="tb-input" defaultValue={name} maxLength={40} required />
          </label>
          <SubmitButton>儲存名稱</SubmitButton>
        </ActionForm>
      )}
    </DialogButton>
  );
}

export function NewLayoutForm({ venueId }: { venueId: string }) {
  const [kind, setKind] = useState<LayoutKind>('classroom');
  const custom = kind === 'custom';
  return (
    <ActionForm action={createLayoutAction} className="flex flex-col gap-3" resetOnSuccess>
      <input type="hidden" name="venueId" value={venueId} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1.2fr)]">
        <label className="tb-label" htmlFor="layout-new-kind">
          配置類型
          <select
            id="layout-new-kind"
            name="kind"
            className="tb-select"
            value={kind}
            onChange={(event) => setKind(event.target.value as LayoutKind)}
          >
            {LAYOUT_KINDS.map((item) => (
              <option key={item} value={item}>
                {LAYOUT_KIND_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="tb-label" htmlFor="layout-new-seats">
          座位數
          <input
            id="layout-new-seats"
            name="seats"
            type="number"
            className="tb-input"
            defaultValue={40}
            min={1}
            max={600}
            step={1}
            disabled={custom}
            required={!custom}
          />
        </label>
        <label className="tb-label" htmlFor="layout-new-name">
          配置名稱
          <input id="layout-new-name" name="name" className="tb-input" maxLength={40} placeholder="例：例會 48 位" required />
        </label>
      </div>
      <p className="text-xs text-tb-faint">
        {custom
          ? '自訂配置只會先放講台和入口，桌椅到編輯器自己加。'
          : '會依場地尺寸自動排出講台、入口和大約這個數量的座位，之後可以在編輯器拖拉調整。'}
      </p>
      <div>
        <SubmitButton>
          <Plus className="h-4 w-4" aria-hidden="true" />
          新增配置
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
