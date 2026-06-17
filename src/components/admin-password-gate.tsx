'use client';

import { FormEvent, useState } from 'react';
import { LockKeyhole, Loader2 } from 'lucide-react';

export function AdminPasswordGate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/admin/access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!response.ok) {
      setError('後台密碼不正確。');
      return;
    }

    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground">
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black">Admin</h1>
              <p className="text-sm text-foreground/55">輸入臨時密碼查看後台紀錄。</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-[0.2em] text-foreground/40">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40"
              autoFocus
            />
            {error ? <p className="text-sm font-medium text-red-600 dark:text-red-300">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-black text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              進入後台
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
