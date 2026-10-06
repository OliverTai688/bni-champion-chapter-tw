import { Empty } from '@/components/tbx/ui';

/**
 * The console layout shows the password gate, but a layout is not re-run when
 * someone navigates between console pages, so pages that read member contact
 * details check access themselves and fall back to this notice.
 */
export function LeaderOnlyNotice() {
  return (
    <Empty
      title="需要領導團隊權限"
      hint="登入已經失效。重新整理這一頁，輸入後台密碼或用 Google 登入後就能繼續。"
      action={
        <a href="/console" className="tb-btn tb-btn-gold">
          重新登入中控
        </a>
      }
    />
  );
}
