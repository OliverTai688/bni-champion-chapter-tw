import type { Metadata } from 'next';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { redeemLoginLinkAction } from '../actions';

export const metadata: Metadata = { title: '確認登入 | 長冠軍工具箱', robots: { index: false } };

export default async function LoginLinkPage({ searchParams }: { searchParams: Promise<{ t?: string; next?: string }> }) {
  const { t = '', next = '/me' } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-4 py-8">
      <div>
        <div className="tb-eyebrow">長冠軍工具箱</div>
        <h1 className="mt-1 text-2xl font-bold">確認登入</h1>
        <p className="mt-1 text-sm text-tb-muted">這是幹部傳給你的個人登入連結。按下按鈕後，這支手機會記住你的會員身份 90 天。</p>
      </div>
      {t ? (
        <ActionForm action={redeemLoginLinkAction} className="flex flex-col gap-3">
          <input type="hidden" name="token" value={t} />
          <input type="hidden" name="next" value={next} />
          <SubmitButton className="tb-btn-lg w-full" pendingText="登入中…">
            確認登入
          </SubmitButton>
        </ActionForm>
      ) : (
        <p className="tb-form-error">連結不完整，請向幹部重新索取。</p>
      )}
      <p className="text-xs text-tb-faint">連結只能使用一次。如果不是你本人收到這個連結，請不要按，並通知幹部。</p>
    </main>
  );
}
