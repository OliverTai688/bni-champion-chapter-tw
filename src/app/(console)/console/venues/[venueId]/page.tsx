import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { ActionForm, ConfirmSubmit } from '@/components/tbx/client';
import { LayoutEditor } from '@/components/tbx/plan/layout-editor';
import { EditVenueDialog, NewLayoutForm, PlainSubmit, RenameLayoutDialog } from '@/components/tbx/plan/venue-forms';
import { Card, Empty, PageHeader } from '@/components/tbx/ui';
import { cn } from '@/lib/utils';
import { layoutKindLabel } from '@/lib/tbx/plan';
import { isObjectId } from '@/server/tbx/action';
import { getVenue } from '@/server/tbx/venues';
import { deleteLayoutAction, duplicateLayoutAction } from '../actions';

export default async function VenueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<{ layout?: string | string[] }>;
}) {
  const { venueId } = await params;
  if (!isObjectId(venueId)) notFound();
  const venue = await getVenue(venueId);
  if (!venue) notFound();

  const query = await searchParams;
  const wanted = typeof query.layout === 'string' ? query.layout : null;
  const current = venue.layouts.find((layout) => layout.id === wanted) ?? venue.layouts[0] ?? null;
  const base = `/console/venues/${venue.id}`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <Link href="/console/venues" className="inline-flex items-center gap-1 text-tb-faint no-underline hover:text-tb-text">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            場地庫
          </Link>
        }
        title={venue.name}
        description={
          <>
            <span className="tb-mono">
              寬 {venue.widthM} × 深 {venue.heightM} 公尺
            </span>
            {venue.address ? (
              <span className="ml-3 inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {venue.address}
              </span>
            ) : null}
            {venue.note ? <span className="mt-1 block text-tb-faint">{venue.note}</span> : null}
          </>
        }
        actions={
          <EditVenueDialog
            className=""
            venue={{
              id: venue.id,
              name: venue.name,
              address: venue.address,
              widthM: venue.widthM,
              heightM: venue.heightM,
              note: venue.note,
            }}
          />
        }
      />

      <Card title="配置" aside={<span>{venue.layouts.length} 個</span>}>
        <div className="flex flex-col gap-4">
          {venue.layouts.length === 0 ? (
            <Empty title="這個場地還沒有配置" hint="在下面選一種類型和座位數，系統會先排出一版，你再拖拉調整。" />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {venue.layouts.map((layout) => {
                const active = layout.id === current?.id;
                return (
                  <li
                    key={layout.id}
                    className={cn(
                      'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2',
                      active ? 'border-tb-gold bg-tb-gold-soft' : 'border-tb-line',
                    )}
                  >
                    <Link
                      href={`${base}?layout=${layout.id}`}
                      aria-current={active ? 'true' : undefined}
                      className="min-w-0 flex-1 text-tb-text no-underline hover:text-tb-gold"
                    >
                      <span className="font-semibold">{layout.name}</span>
                      <span className="ml-2 text-xs text-tb-faint">{layoutKindLabel(layout.kind)}</span>
                      {active ? <span className="ml-2 text-xs text-tb-gold">編輯中</span> : null}
                    </Link>
                    <span className="tb-mono text-tb-muted">{layout.seatCount} 位</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {active ? null : (
                        <Link href={`${base}?layout=${layout.id}`} className="tb-btn tb-btn-sm">
                          編輯
                        </Link>
                      )}
                      <RenameLayoutDialog layoutId={layout.id} name={layout.name} />
                      <ActionForm action={duplicateLayoutAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="layoutId" value={layout.id} />
                        <PlainSubmit pendingText="複製中…">複製</PlainSubmit>
                      </ActionForm>
                      <ActionForm action={deleteLayoutAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="layoutId" value={layout.id} />
                        <ConfirmSubmit confirmText="確定刪除">刪除</ConfirmSubmit>
                      </ActionForm>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-tb-line pt-4">
            <h3 className="mb-3 text-sm font-bold">從範本新增配置</h3>
            <NewLayoutForm venueId={venue.id} />
          </div>
        </div>
      </Card>

      {current ? (
        <Card title={`編輯配置：${current.name}`} aside={<span>已建立的活動座位表不會跟著變動</span>}>
          <LayoutEditor
            key={current.id}
            layoutId={current.id}
            widthM={venue.widthM}
            heightM={venue.heightM}
            initialObjects={current.objects}
          />
        </Card>
      ) : null}
    </div>
  );
}
