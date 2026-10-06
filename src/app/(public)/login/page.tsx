import type { Metadata } from 'next';
import Link from 'next/link';
import { listChapterMembers } from '@/server/tbx/members';
import { getViewer } from '@/server/tbx/viewer';
import { clearMemberAction } from './actions';
import { MemberPicker } from './member-picker';

export const metadata: Metadata = { title: '選擇會員身份 | 長冠軍工具箱' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/me';
  const [members, viewer] = await Promise.all([listChapterMembers(), getViewer()]);

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-4 py-8">
      <div>
        <div className="tb-eyebrow">長冠軍工具箱</div>
        <h1 className="mt-1 text-2xl font-bold">你是哪一位會員？</h1>
        <p className="mt-1 text-sm text-tb-muted">選擇後，這支手機會記住你的身份，之後直接看到自己的座位與燈號。</p>
      </div>

      {viewer.member ? (
        <div className="tb-banner tb-banner-ok">
          <div className="min-w-0 flex-1">
            <p className="font-bold">目前身份：{viewer.member.displayName}</p>
            <p className="text-sm text-tb-muted">要換人使用，可以先清除身份。</p>
          </div>
          <Link href={safeNext} className="tb-btn tb-btn-gold">
            繼續
          </Link>
          <form action={clearMemberAction}>
            <button type="submit" className="tb-btn">
              清除身份
            </button>
          </form>
        </div>
      ) : null}

      <MemberPicker members={members.map((member) => ({ id: member.id, name: member.displayName, group: member.adminGroup }))} next={safeNext} />

      <p className="text-xs text-tb-faint">
        過渡期做法：目前只靠選擇姓名，尚未驗證是不是本人，所以會員區只放不敏感的資料。之後會改成正式登入。
      </p>
      <Link href="/console" className="text-center text-sm text-tb-muted">
        我是幹部，前往領導團隊中控
      </Link>
    </main>
  );
}
