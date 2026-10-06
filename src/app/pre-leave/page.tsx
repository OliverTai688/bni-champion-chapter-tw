'use client';

import { useMemo, useState } from 'react';
import { CHAPTER_MEMBER_DIRECTORY } from '@/lib/chapter-members';
import { Calendar, User, UserCog, CheckCircle, Loader2, RefreshCw, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function getUpcomingThursdays(count = 5): string[] {
  const dates: string[] = [];
  const current = new Date();
  for (let i = 0; i < 45; i++) {
    const d = new Date(current.getTime() + i * 24 * 60 * 60 * 1000);
    if (d.getDay() === 4) { // Thursday
      // Local calendar date; toISOString() is UTC and shifts to Wednesday before 08:00 in UTC+8.
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      if (dates.length >= count) break;
    }
  }
  return dates;
}

export default function PreLeavePage() {
  const upcomingThursdays = useMemo(() => getUpcomingThursdays(), []);
  
  const [dateMode, setDateMode] = useState<'upcoming' | 'custom'>('upcoming');
  const [selectedDate, setSelectedDate] = useState(upcomingThursdays[0] ?? '');
  const [customDate, setCustomDate] = useState('');
  
  const [selectedMember, setSelectedMember] = useState('');
  const [status, setStatus] = useState<'absent' | 'proxy' | 'present'>('absent');
  const [proxyName, setProxyName] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const finalDate = dateMode === 'upcoming' ? selectedDate : customDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!finalDate) {
      setError('請選擇或輸入活動日期。');
      return;
    }
    if (!selectedMember) {
      setError('請選擇您的會員姓名。');
      return;
    }
    if (status === 'proxy' && !proxyName.trim()) {
      setError('請輸入代理人姓名。');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/public/pre-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: finalDate,
          memberName: selectedMember,
          status,
          proxyName: status === 'proxy' ? proxyName.trim() : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? '登記失敗，請重試。');

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '連線失敗，請重試。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setSelectedMember('');
    setStatus('absent');
    setProxyName('');
    setError(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-foreground/[0.02] border border-foreground/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-foreground/45 hover:text-foreground font-black uppercase tracking-wider transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            返回首頁
          </Link>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/35">BNI Champion</div>
        </div>

        {success ? (
          <div className="space-y-6 text-center py-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-10 w-10 animate-bounce" />
            </div>
            <div>
              <h2 className="text-2xl font-black">登記成功！</h2>
              <p className="mt-2 text-sm text-foreground/55">
                您的出席請假/代理資訊已成功紀錄。<br />
                當管理員建立 {finalDate} 的座位表時，將會自動帶入此設定。
              </p>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4 text-left text-xs font-bold space-y-2">
              <div className="flex justify-between">
                <span className="text-foreground/40">活動日期</span>
                <span className="text-foreground/80">{finalDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/40">會員姓名</span>
                <span className="text-foreground/80">{selectedMember}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/40">登記項目</span>
                <span className={`font-black ${status === 'absent' ? 'text-red-500' : status === 'proxy' ? 'text-indigo-500' : 'text-emerald-500'}`}>
                  {status === 'absent' ? '請假無代理' : status === 'proxy' ? '安排代理人' : '正常出席'}
                </span>
              </div>
              {status === 'proxy' && (
                <div className="flex justify-between border-t border-foreground/5 pt-2 mt-2">
                  <span className="text-foreground/40">代理人</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{proxyName}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-background hover:bg-foreground/[0.04] px-4 py-3 text-xs font-black transition"
            >
              <RefreshCw className="h-4 w-4" />
              繼續登記其他日期 / 人員
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h1 className="text-2xl font-black tracking-tight">成員請假 / 代理人登記</h1>
              <p className="mt-1.5 text-xs text-foreground/55 leading-relaxed">
                若本週或未來例會您無法出席，請在此登記。我們會先將資料記錄下來，並在管理員安排座位時自動套用。
              </p>
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-bold text-red-700 dark:text-red-300">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Date selection mode */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-foreground/45 uppercase tracking-wider">
                活動日期選擇
              </label>
              <div className="grid grid-cols-2 gap-2 bg-background/50 border border-foreground/10 p-1 rounded-xl text-xs font-black">
                <button
                  type="button"
                  onClick={() => setDateMode('upcoming')}
                  className={`rounded-lg py-2 transition ${
                    dateMode === 'upcoming' ? 'bg-foreground text-background shadow' : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  近期例會 (星期四)
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('custom')}
                  className={`rounded-lg py-2 transition ${
                    dateMode === 'custom' ? 'bg-foreground text-background shadow' : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  自訂其他日期
                </button>
              </div>

              {dateMode === 'upcoming' ? (
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-foreground/35" />
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-foreground/15 bg-background pl-10 pr-4 py-3 text-xs font-black outline-none focus:border-foreground/45 transition"
                  >
                    {upcomingThursdays.map((date) => {
                      return (
                        <option key={date} value={date}>
                          {date} (四) 例會
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-foreground/35" />
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-background pl-10 pr-4 py-3 text-xs font-black outline-none focus:border-foreground/45 transition"
                  />
                </div>
              )}
            </div>

            {/* Member Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-foreground/45 uppercase tracking-wider">
                會員姓名
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-foreground/35" />
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-foreground/15 bg-background pl-10 pr-4 py-3 text-xs font-black outline-none focus:border-foreground/45 transition"
                >
                  <option value="">-- 請選擇您的姓名 --</option>
                  {CHAPTER_MEMBER_DIRECTORY.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.adminGroup ?? '無分組'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attendance Status */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-foreground/45 uppercase tracking-wider">
                登記項目
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setStatus('absent')}
                  className={`flex flex-col items-center justify-center border rounded-xl p-3 gap-2.5 transition ${
                    status === 'absent'
                      ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 font-black'
                      : 'border-foreground/10 bg-background/40 text-foreground/60 hover:bg-foreground/[0.02]'
                  }`}
                >
                  <XCircle className="h-5 w-5" />
                  請假無代理
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('proxy')}
                  className={`flex flex-col items-center justify-center border rounded-xl p-3 gap-2.5 transition ${
                    status === 'proxy'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-black'
                      : 'border-foreground/10 bg-background/40 text-foreground/60 hover:bg-foreground/[0.02]'
                  }`}
                >
                  <UserCog className="h-5 w-5" />
                  安排代理人
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('present')}
                  className={`flex flex-col items-center justify-center border rounded-xl p-3 gap-2.5 transition ${
                    status === 'present'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-black'
                      : 'border-foreground/10 bg-background/40 text-foreground/60 hover:bg-foreground/[0.02]'
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  取消請假
                </button>
              </div>
            </div>

            {/* Proxy Name */}
            {status === 'proxy' ? (
              <div className="space-y-2">
                <label className="block text-xs font-black text-foreground/45 uppercase tracking-wider">
                  代理人姓名
                </label>
                <div className="relative">
                  <UserCog className="absolute left-3.5 top-3 h-4 w-4 text-foreground/35" />
                  <input
                    type="text"
                    placeholder="輸入代理人姓名，例如：王大同"
                    value={proxyName}
                    onChange={(e) => setProxyName(e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-background pl-10 pr-4 py-3 text-xs font-black outline-none focus:border-foreground/45 transition"
                  />
                </div>
              </div>
            ) : null}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-black text-background transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              確認登記出席狀態
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
