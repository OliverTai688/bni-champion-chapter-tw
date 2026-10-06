import { Empty } from '@/components/tbx/ui';

/** Shown when a scorecard console page is reached without leadership access. */
export function LeaderRequired() {
  return (
    <Empty
      title="這一頁只開放給領導團隊"
      hint="燈號與 PALMS 資料包含全體會員的數字。請先用後台密碼或 Google 帳號登入中控。"
      action={
        <a href="/console" className="tb-btn tb-btn-gold">
          前往登入
        </a>
      }
    />
  );
}
