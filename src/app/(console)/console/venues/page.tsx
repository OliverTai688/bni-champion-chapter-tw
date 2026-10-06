import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { ActionForm, ConfirmSubmit, SubmitButton } from '@/components/tbx/client';
import { PlanThumb } from '@/components/tbx/plan/plan-view';
import { EditVenueDialog, NewVenueDialog } from '@/components/tbx/plan/venue-forms';
import { Empty, PageHeader } from '@/components/tbx/ui';
import { layoutKindLabel } from '@/lib/tbx/plan';
import { listVenues } from '@/server/tbx/venues';
import { createSampleVenueAction, deleteVenueAction } from './actions';

export default async function VenuesPage() {
  const venues = await listVenues();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="場地"
        title="場地庫"
        description="每個場地記錄空間尺寸，底下可以有多種配置（教室型、圓桌、U 字型…）。活動的座位表會從這裡複製一份配置，之後再改場地不會影響已建立的座位表。"
        actions={<NewVenueDialog />}
      />

      {venues.length === 0 ? (
        <Empty
          title="還沒有場地"
          hint="先建立常用的會議室，再替它畫出座位配置。也可以先建立一個範例場地（20 × 14 公尺、教室型 48 位）來試用。"
          action={
            <ActionForm action={createSampleVenueAction} className="flex flex-col items-center gap-2">
              <SubmitButton pendingText="建立中…">建立範例場地</SubmitButton>
            </ActionForm>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {venues.map((venue) => {
            const first = venue.layouts[0];
            const href = `/console/venues/${venue.id}`;
            return (
              <section key={venue.id} className="tb-card flex flex-col">
                <div className="tb-card-body flex flex-1 flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold">
                        <Link href={href} className="text-tb-text no-underline hover:text-tb-gold">
                          {venue.name}
                        </Link>
                      </h2>
                      {venue.address ? (
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-tb-muted">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{venue.address}</span>
                        </p>
                      ) : null}
                    </div>
                    <span className="tb-mono shrink-0 text-tb-faint">
                      {venue.widthM} × {venue.heightM} m
                    </span>
                  </div>

                  {first ? (
                    <Link href={href} aria-label={`開啟 ${venue.name} 的配置`} className="block">
                      <PlanThumb
                        widthM={venue.widthM}
                        heightM={venue.heightM}
                        objects={first.objects}
                        className="max-h-[220px] border border-tb-line"
                      />
                    </Link>
                  ) : (
                    <div className="rounded-lg border border-dashed border-tb-line px-4 py-8 text-center text-sm text-tb-muted">
                      還沒有配置，開啟場地後新增第一個。
                    </div>
                  )}

                  {venue.layouts.length > 0 ? (
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                      {venue.layouts.map((layout) => (
                        <li key={layout.id} className="flex items-center justify-between gap-3 text-sm">
                          <Link
                            href={`${href}?layout=${layout.id}`}
                            className="min-w-0 truncate text-tb-text no-underline hover:text-tb-gold"
                          >
                            {layout.name}
                            <span className="ml-2 text-xs text-tb-faint">{layoutKindLabel(layout.kind)}</span>
                          </Link>
                          <span className="tb-mono shrink-0 text-tb-muted">{layout.seatCount} 位</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {venue.note ? <p className="text-xs text-tb-faint">{venue.note}</p> : null}

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-tb-line pt-3">
                    <Link href={href} className="tb-btn tb-btn-sm">
                      開啟配置
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <EditVenueDialog
                      venue={{
                        id: venue.id,
                        name: venue.name,
                        address: venue.address,
                        widthM: venue.widthM,
                        heightM: venue.heightM,
                        note: venue.note,
                      }}
                    />
                    <span className="flex-1" />
                    <ActionForm action={deleteVenueAction} className="flex flex-col items-end gap-1">
                      <input type="hidden" name="venueId" value={venue.id} />
                      <ConfirmSubmit confirmText={venue.layouts.length > 0 ? `確定刪除場地和 ${venue.layouts.length} 個配置` : '確定刪除'}>
                        刪除場地
                      </ConfirmSubmit>
                    </ActionForm>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
