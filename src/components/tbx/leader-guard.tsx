import { isLeader } from '@/server/tbx/viewer';

/**
 * Console layouts only run their access check on a full page load. Client-side
 * navigation re-renders the page alone, so every console page that shows data
 * calls this first and returns the notice when access has lapsed.
 */
export async function leaderGuard() {
  if (await isLeader()) return null;
  return (
    <div className="tb-banner tb-banner-bad">
      <div className="min-w-0 flex-1">
        <p className="font-bold">需要領導團隊權限</p>
        <p className="text-sm text-tb-muted">登入已過期或尚未登入。重新登入後再開啟這一頁。</p>
      </div>
      {/* Plain anchor on purpose: a full reload makes the console layout show the sign-in gate. */}
      <a href="/console" className="tb-btn tb-btn-gold">
        重新登入
      </a>
    </div>
  );
}
