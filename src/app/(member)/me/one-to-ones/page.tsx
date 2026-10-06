import { Empty } from '@/components/tbx/ui';

export default function MemberOneToOnesPage() {
  return (
    <>
      <div>
        <div className="tb-eyebrow">規劃中</div>
        <h1 className="mt-1 text-2xl font-bold">一對一</h1>
      </div>
      <Empty title="這個工具還沒有開放" hint="之後可以在這裡記錄一對一會面與下一步。" />
    </>
  );
}
