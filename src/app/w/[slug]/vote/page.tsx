import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toPublicWeeklyEventDTO } from '@/application/events/mappers';
import { findPublicWeeklyEventBySlug } from '@/server/repositories/weekly-public-event-repository';
import { PublicVoteClient } from '@/components/public-vote-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '投票 | Take Seat',
  description: '依照公開座位圖進行現場投票',
};

export default async function VotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await findPublicWeeklyEventBySlug(slug);
  if (!event) notFound();

  const dto = toPublicWeeklyEventDTO(event);

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-foreground/35">{dto.chapterName}</div>
            <h1 className="mt-2 text-2xl font-black">{dto.title}</h1>
          </div>
          <Link
            href={`/w/${dto.slug}`}
            className="inline-flex items-center gap-2 rounded-md border border-foreground/15 px-3 py-2 text-xs font-black text-foreground/65 hover:bg-foreground/[0.05]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            回公開頁
          </Link>
        </div>

        <PublicVoteClient event={dto} />
      </section>
    </main>
  );
}
