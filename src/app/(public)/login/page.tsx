import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogIn, MessageCircle } from 'lucide-react';
import { LINE_LOGIN_ENABLED } from '@/auth';
import { getGoogleIdentity, getLineIdentity } from '@/server/auth/access';
import { listUnboundLineMembers } from '@/server/tbx/member-identity';
import { getViewer } from '@/server/tbx/viewer';
import { clearMemberAction, googleSignInAction, lineSignInAction } from './actions';
import { LineBinding } from './line-binding';

export const metadata: Metadata = { title: '會員登入 | 長冠軍工具箱' };

const ERROR_TEXT: Record<string, string> = {
  AccessDenied: '這個 Google 帳號還沒有登記在會員名冊。請幹部在你的會員檔案填上這個 Email，或請幹部傳一個登入連結給你。',
  Configuration: 'Google 登入暫時無法使用，請改用幹部提供的登入連結。',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; via?: string }> }) {
  const { next, error, via } = await searchParams;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/me';
  const [viewer, google, line] = await Promise.all([getViewer(), getGoogleIdentity(), getLineIdentity()]);
  // Back from LINE with a bound account: go straight on.
  if (via === 'line' && viewer.member) redirect(safeNext);
  const unbound = line && !viewer.member ? await listUnboundLineMembers() : [];
  const errorText = error ? ERROR_TEXT[error] ?? '登入沒有成功，請再試一次，或請幹部傳登入連結給你。' : null;

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-4 py-8">
      <div>
        <div className="tb-eyebrow">長冠軍工具箱</div>
        <h1 className="mt-1 text-2xl font-bold">會員登入</h1>
        <p className="mt-1 text-sm text-tb-muted">登入後可以看自己的座位、燈號與活動，並修改自己的商務檔案。</p>
      </div>

      {errorText ? <p className="tb-form-error">{errorText}</p> : null}

      {viewer.member ? (
        <div className="tb-banner tb-banner-ok">
          <div className="min-w-0 flex-1">
            <p className="font-bold">已登入：{viewer.member.displayName}</p>
            <p className="text-sm text-tb-muted">{line ? '已用 LINE 登入' : google ? `Google 帳號 ${google.email}` : '這支手機已記住你的身份。'}</p>
          </div>
          <Link href={safeNext} className="tb-btn tb-btn-gold">
            繼續
          </Link>
          <form action={clearMemberAction}>
            <button type="submit" className="tb-btn">
              登出
            </button>
          </form>
        </div>
      ) : line ? (
        <section className="tb-card">
          <div className="tb-card-head">
            <h2>第一次用 LINE 登入</h2>
          </div>
          <div className="tb-card-body flex flex-col gap-4">
            <p className="text-sm text-tb-muted">
              LINE 帳號{line.name ? `「${line.name}」` : ''}還沒有綁定會員。請選擇你的姓名，綁定後之後用 LINE 就會直接登入。每位會員只能綁定一個 LINE 帳號。
            </p>
            <LineBinding members={unbound.map((member) => ({ id: member.id, name: member.displayName, group: member.adminGroup }))} next={safeNext} />
            <form action={clearMemberAction}>
              <button type="submit" className="tb-btn tb-btn-quiet w-full">
                不是我，換一個帳號
              </button>
            </form>
          </div>
        </section>
      ) : (
        <>
          {LINE_LOGIN_ENABLED ? (
            <form action={lineSignInAction}>
              <input type="hidden" name="next" value={safeNext} />
              <button type="submit" className="tb-btn tb-btn-lg w-full" style={{ background: '#06C755', borderColor: '#06C755', color: '#fff' }}>
                <MessageCircle className="h-5 w-5" aria-hidden />
                用 LINE 登入
              </button>
              <p className="mt-2 text-xs text-tb-faint">第一次登入時選擇你的姓名完成綁定，之後就會自動登入。</p>
            </form>
          ) : null}
          <section className="tb-card">
            <div className="tb-card-head">
              <h2>用 Google 登入</h2>
            </div>
            <div className="tb-card-body flex flex-col gap-3">
              <p className="text-sm text-tb-muted">使用你登記在會員名冊上的 Email 對應的 Google 帳號。</p>
              <form action={googleSignInAction}>
                <input type="hidden" name="next" value={safeNext} />
                <button type="submit" className="tb-btn tb-btn-gold tb-btn-lg w-full">
                  <LogIn className="h-4 w-4" aria-hidden />
                  用 Google 登入
                </button>
              </form>
              {google ? (
                <p className="text-xs text-tb-faint">
                  目前的 Google 帳號 {google.email} 沒有對應到會員。可以換一個帳號，或使用登入連結。
                </p>
              ) : null}
            </div>
          </section>

          <section className="tb-card">
            <div className="tb-card-head">
              <h2>用登入連結</h2>
            </div>
            <div className="tb-card-body">
              <p className="text-sm text-tb-muted">
                沒有 Google 帳號，或 Email 還沒登記的會員，請向幹部索取個人登入連結。連結只能用一次，{' '}
                打開後按「確認登入」即可。
              </p>
            </div>
          </section>
        </>
      )}

      <Link href="/console" className="text-center text-sm text-tb-muted">
        我是幹部，前往領導團隊中控
      </Link>
    </main>
  );
}
