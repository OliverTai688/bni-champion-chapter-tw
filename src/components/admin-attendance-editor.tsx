'use client';

import { useMemo, useState } from 'react';
import { CHAPTER_MEMBER_DIRECTORY } from '@/lib/chapter-members';
import { CheckCircle2, Loader2, Save, Search, UserCog, XCircle, AlertCircle } from 'lucide-react';

interface AttendanceOverride {
  status: 'present' | 'absent' | 'late' | 'proxy';
  proxyName?: string;
}

export function AdminAttendanceEditor({
  weekId,
  initialOverrides = {},
}: {
  weekId: string;
  initialOverrides?: Record<string, AttendanceOverride>;
}) {
  const [overrides, setOverrides] = useState<Record<string, AttendanceOverride>>(initialOverrides);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'overridden'>('all');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const membersList = useMemo(() => {
    return CHAPTER_MEMBER_DIRECTORY.map((member) => {
      const override = overrides[member.name] || overrides[member.name.trim()];
      return {
        ...member,
        override,
      };
    });
  }, [overrides]);

  const filteredMembers = useMemo(() => {
    return membersList.filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterMode === 'all' || !!m.override;
      return matchesSearch && matchesFilter;
    });
  }, [membersList, searchQuery, filterMode]);

  const handleStatusChange = (memberName: string, status: 'default' | 'present' | 'absent' | 'late' | 'proxy') => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (status === 'default') {
        delete next[memberName];
      } else {
        next[memberName] = {
          status,
          proxyName: status === 'proxy' ? prev[memberName]?.proxyName ?? '' : undefined,
        };
      }
      return next;
    });
  };

  const handleProxyNameChange = (memberName: string, proxyName: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (next[memberName]) {
        next[memberName] = {
          ...next[memberName],
          proxyName,
        };
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    // Clean up proxy overrides with empty proxyNames
    const cleanOverrides: Record<string, AttendanceOverride> = {};
    for (const [name, val] of Object.entries(overrides)) {
      if (val.status === 'proxy' && !val.proxyName?.trim()) {
        cleanOverrides[name] = { ...val, proxyName: '代理人' };
      } else {
        cleanOverrides[name] = val;
      }
    }

    try {
      const response = await fetch(`/api/admin/events/${weekId}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceOverrides: cleanOverrides }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? '儲存出席紀錄失敗。');

      setOverrides(cleanOverrides);
      setMessage({ text: '出席紀錄已成功儲存！', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '連線失敗。', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-foreground/10 bg-foreground/[0.03] p-5 mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-foreground/35">Attendance Management</div>
          <h2 className="mt-1 text-xl font-black">實體/代理出席管理</h2>
          <p className="mt-1 text-sm text-foreground/55">
            在此編輯個別會員的出勤狀態。設定的狀態將會直接覆蓋座位表狀態，並納入出席統計與 Excel 匯出。
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-xs font-black text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          儲存出席紀錄
        </button>
      </div>

      {message ? (
        <div
          className={`mb-4 rounded-md border p-3 text-xs font-bold ${
            message.type === 'error'
              ? 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300'
              : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-grow max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground/35" />
          <input
            type="text"
            placeholder="搜尋會員姓名..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-foreground/10 bg-background pl-9 pr-3 py-2 text-xs font-bold outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        {/* Filter Tab */}
        <div className="flex rounded-md border border-foreground/10 bg-background/50 p-1 text-xs font-bold">
          <button
            onClick={() => setFilterMode('all')}
            className={`rounded px-3 py-1 transition ${
              filterMode === 'all' ? 'bg-foreground text-background font-black' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            全部 ({membersList.length})
          </button>
          <button
            onClick={() => setFilterMode('overridden')}
            className={`rounded px-3 py-1 transition ${
              filterMode === 'overridden' ? 'bg-foreground text-background font-black' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            已覆蓋 ({Object.keys(overrides).length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-foreground/10 bg-background/70 max-h-[500px] overflow-y-auto [scrollbar-width:thin]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-foreground/[0.03] border-b border-foreground/10 text-foreground/45 font-black uppercase tracking-wider">
              <th className="px-4 py-3">姓名</th>
              <th className="px-4 py-3">分組</th>
              <th className="px-4 py-3">出席狀態設定</th>
              <th className="px-4 py-3">代理人姓名</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10 font-bold">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const override = member.override;
                const status: 'default' | 'present' | 'absent' | 'late' | 'proxy' = override?.status ?? 'default';

                return (
                  <tr key={member.name} className="hover:bg-foreground/[0.01]">
                    <td className="px-4 py-3.5">
                      <div>
                        <div className="font-bold text-sm text-foreground/90">{member.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.roles.map((r) => (
                            <span key={r} className="px-1.5 py-0.5 rounded bg-foreground/5 text-[9px] text-foreground/40 font-medium">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-foreground/50">{member.adminGroup ?? '無'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        <StatusButton
                          active={(status as string) === 'default'}
                          onClick={() => handleStatusChange(member.name, 'default')}
                          colorClass="border-foreground/15 bg-background text-foreground/75"
                          activeClass="bg-foreground/10 text-foreground border-foreground/30 font-black"
                          label="預設"
                        />
                        <StatusButton
                          active={status === 'present'}
                          onClick={() => handleStatusChange(member.name, 'present')}
                          colorClass="border-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          activeClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          icon={<CheckCircle2 className="h-3 w-3 shrink-0" />}
                          label="出席"
                        />
                        <StatusButton
                          active={status === 'late'}
                          onClick={() => handleStatusChange(member.name, 'late')}
                          colorClass="border-amber-500/10 text-amber-600 dark:text-amber-400"
                          activeClass="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                          icon={<AlertCircle className="h-3 w-3 shrink-0" />}
                          label="遲到"
                        />
                        <StatusButton
                          active={status === 'absent'}
                          onClick={() => handleStatusChange(member.name, 'absent')}
                          colorClass="border-red-500/10 text-red-600 dark:text-red-400"
                          activeClass="bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                          icon={<XCircle className="h-3 w-3 shrink-0" />}
                          label="未出席"
                        />
                        <StatusButton
                          active={status === 'proxy'}
                          onClick={() => handleStatusChange(member.name, 'proxy')}
                          colorClass="border-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          activeClass="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                          icon={<UserCog className="h-3 w-3 shrink-0" />}
                          label="代理"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {status === 'proxy' ? (
                        <input
                          type="text"
                          placeholder="輸入代理人姓名"
                          value={override?.proxyName ?? ''}
                          onChange={(e) => handleProxyNameChange(member.name, e.target.value)}
                          className="w-full max-w-[150px] rounded-md border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-1 text-xs font-bold outline-none focus:border-indigo-500/40 transition-colors placeholder:text-indigo-500/30 text-indigo-800 dark:text-indigo-200"
                        />
                      ) : (
                        <span className="text-foreground/20">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-foreground/40">
                  沒有符合搜尋的會員。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusButton({
  active,
  onClick,
  colorClass,
  activeClass,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  colorClass: string;
  activeClass: string;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 transition-all ${
        active ? activeClass : `${colorClass} hover:bg-foreground/[0.03] opacity-65`
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
