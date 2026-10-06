import Link from 'next/link';

export default function MemberAiPage() {
  return (
    <>
      <div>
        <div className="tb-eyebrow">商會 AI</div>
        <h1 className="mt-1 text-2xl font-bold">AI 還沒有接上</h1>
        <p className="mt-1 text-sm text-tb-muted">
          接上之後，你可以直接用一句話請假、找代理或問座位。AI 只會看到你自己的資料，送出前都會先讓你確認。
        </p>
      </div>
      <section className="tb-card flex flex-col gap-3 p-4">
        <p className="font-bold">現在可以直接做的事</p>
        <Link href="/me/events" className="tb-btn tb-btn-lg">
          請假或找代理
        </Link>
        <Link href="/me" className="tb-btn tb-btn-lg">
          看我的座位與簽到
        </Link>
        <Link href="/me/scorecard" className="tb-btn tb-btn-lg">
          看我的燈號
        </Link>
      </section>
    </>
  );
}
