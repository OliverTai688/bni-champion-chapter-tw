import Link from 'next/link';
import { Card, PageHeader } from '@/components/tbx/ui';

const PLANNED = [
  { title: '例會營運', body: '整理請假與代理、產生座位草稿、提醒還沒簽到的人。' },
  { title: '會員經營', body: '燈號轉黃或轉紅時提醒，並建議一對一對象。' },
  { title: '人脈與產業鏈', body: '依會員檔案與引薦紀錄找出缺口產業，建議邀賓方向。' },
  { title: '一對一追蹤', body: '會後摘要、下一步、到期提醒。' },
];

export default function ConsoleAiPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="/console/ai"
        title="商會 AI"
        description="AI 還沒有接上。這一頁先說明它會做什麼，以及現在可以直接用的工具。"
      />
      <div className="tb-banner">
        <div className="min-w-0 flex-1">
          <p className="font-bold">尚未啟用</p>
          <p className="text-sm text-tb-muted">
            接上之後，AI 只會透過和這些頁面相同的功能操作資料：讀取可以直接做，寫入要你確認，發通知與開抽這類無法收回的動作一定由人按。
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PLANNED.map((item) => (
          <Card key={item.title} title={item.title}>
            <p className="text-sm text-tb-muted">{item.body}</p>
          </Card>
        ))}
      </div>
      <Card title="現在可以直接做的事">
        <div className="flex flex-wrap gap-2">
          <Link href="/console/events" className="tb-btn">
            看活動與出席
          </Link>
          <Link href="/console/scorecard" className="tb-btn">
            看綠燈會員
          </Link>
          <Link href="/console/members" className="tb-btn">
            看會員名冊
          </Link>
        </div>
      </Card>
    </div>
  );
}
