'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Headphones, Users, UserCheck, Crown, UserCog, Link2, Trophy, Plus, Trash2 } from 'lucide-react';
import type { Roster, GuestPair, IndustryChain } from '@/types/seating';
import { INDUSTRY_GROUP_COLORS } from '@/lib/industry-chains';

interface RuleEditorProps {
  open: boolean;
  onClose: () => void;
  roster: Roster;
  onApply: (next: Roster) => void;
}

export function RuleEditor({ open, onClose, roster, onApply }: RuleEditorProps) {
  const [draft, setDraft] = React.useState<Roster>(roster);

  // Re-sync when panel re-opens with a new source-of-truth roster
  React.useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDraft(roster), 0);
    return () => window.clearTimeout(timer);
  }, [open, roster]);

  const updateHostTeam = (idx: number, name: string) => {
    setDraft((d) => ({
      ...d,
      hostTeam: d.hostTeam.map((m, i) => (i === idx ? { ...m, name } : m)),
    }));
  };

  const updateGuest = (idx: number, patch: Partial<GuestPair>) => {
    setDraft((d) => ({
      ...d,
      guests: d.guests.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
    }));
  };

  const addGuest = () => {
    setDraft((d) => {
      const nextNumber = d.guests.length + 1;
      return {
        ...d,
        guests: [...d.guests, { number: `賓${nextNumber}`, guestName: '', hostName: '' }],
      };
    });
  };

  const removeGuest = (idx: number) => {
    setDraft((d) => ({
      ...d,
      guests: d.guests
        .filter((_, i) => i !== idx)
        .map((g, i) => ({ ...g, number: `賓${i + 1}` })),
    }));
  };

  const updateMember = (idx: number, name: string) => {
    setDraft((d) => ({
      ...d,
      members: d.members.map((m, i) => (i === idx ? name : m)),
    }));
  };

  const addMember = () => {
    setDraft((d) => ({ ...d, members: [...d.members, ''] }));
  };

  const removeMember = (idx: number) => {
    setDraft((d) => ({ ...d, members: d.members.filter((_, i) => i !== idx) }));
  };

  const updateProxy = (idx: number, name: string) => {
    setDraft((d) => ({
      ...d,
      proxies: d.proxies.map((p, i) => (i === idx ? name : p)),
    }));
  };

  const addProxy = () => {
    setDraft((d) => ({ ...d, proxies: [...d.proxies, ''] }));
  };

  const removeProxy = (idx: number) => {
    setDraft((d) => ({ ...d, proxies: d.proxies.filter((_, i) => i !== idx) }));
  };

  const addHero = () => {
    setDraft((d) => ({ ...d, heroes: [...d.heroes, ''] }));
  };

  const removeHero = (idx: number) => {
    setDraft((d) => ({ ...d, heroes: d.heroes.filter((_, i) => i !== idx) }));
  };

  const updateChainMembers = (chainId: string, membersText: string) => {
    setDraft((d) => ({
      ...d,
      industryChains: d.industryChains.map((c) =>
        c.id === chainId
          ? { ...c, members: membersText.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean) }
          : c,
      ),
    }));
  };

  const chainsByGroup = React.useMemo(() => {
    const groups: Record<string, IndustryChain[]> = {};
    for (const c of draft.industryChains) {
      (groups[c.group] ??= []).push(c);
    }
    return groups;
  }, [draft.industryChains]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="rule-editor-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm no-print"
          />

          {/* Panel */}
          <motion.aside
            key="rule-editor-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
            className="
              fixed right-0 top-0 z-50 h-full w-full max-w-md no-print
              bg-background text-foreground border-l border-foreground/10
              shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-foreground/10">
              <div>
                <h2 className="text-xl font-bold">規則編輯</h2>
                <p className="text-xs text-foreground/50 mt-0.5">成員名單是固定資料，座位由拖拉與套用規則調整</p>
              </div>
              <button
                onClick={onClose}
                aria-label="關閉"
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-foreground/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
              {/* 英雄榜 */}
              <section className="rounded-2xl border-2 border-yellow-500/50 dark:border-yellow-400/50 bg-yellow-50 dark:bg-yellow-400/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400">本週英雄榜</h3>
                  <span className="text-[11px] text-foreground/40 ml-auto">依順序排列 英1→英{draft.heroes.length}</span>
                </div>
                <div className="space-y-2">
                  {draft.heroes.map((name, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-yellow-600 dark:text-yellow-500 w-6 shrink-0">英{i + 1}</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setDraft((d) => ({
                          ...d,
                          heroes: d.heroes.map((h, j) => j === i ? e.target.value : h),
                        }))}
                        className="
                          flex-1 h-9 px-3 rounded-lg text-sm font-bold
                          bg-amber-100 border border-amber-400/60 text-amber-900
                          dark:bg-yellow-400/10 dark:border-yellow-400/30 dark:text-yellow-200
                          focus:border-amber-500 dark:focus:border-yellow-400/70
                          outline-none transition-colors
                        "
                      />
                      <IconButton label="移除英雄榜" onClick={() => removeHero(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  ))}
                  {draft.heroes.length === 0 && (
                    <p className="text-xs text-yellow-700/70 dark:text-yellow-300/70">本週尚未設定英雄榜。</p>
                  )}
                </div>
                <TextButton onClick={addHero} icon={<Plus className="h-3.5 w-3.5" />}>新增英雄榜</TextButton>
              </section>

              {/* 主持團 */}
              <Section icon={<Crown className="h-4 w-4" />} title="主持團" hint="固定 5 個職位">
                <div className="space-y-2">
                  {draft.hostTeam.map((m, i) => (
                    <Field key={m.role} label={m.role}>
                      <Input value={m.name} onChange={(v) => updateHostTeam(i, v)} />
                    </Field>
                  ))}
                </div>
              </Section>

              {/* 當期值班 */}
              <Section icon={<Headphones className="h-4 w-4" />} title="當期值班" hint="每次指定">
                <div className="space-y-2">
                  <Field label="音控">
                    <Input value={draft.sound} onChange={(v) => setDraft((d) => ({ ...d, sound: v }))} />
                  </Field>
                  <Field label="值日生">
                    <Input value={draft.duty} onChange={(v) => setDraft((d) => ({ ...d, duty: v }))} />
                  </Field>
                </div>
              </Section>

              {/* 來賓 + 執事 */}
              <Section
                icon={<UserCheck className="h-4 w-4" />}
                title="來賓 ↔ 執事"
                hint={`共 ${draft.guests.length} 位 — 執事坐在來賓正後方`}
              >
                <div className="space-y-3">
                  {draft.guests.map((g, i) => (
                    <div
                      key={g.number}
                      className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-black rounded-full">
                          {g.number}
                        </span>
                        <Input
                          value={g.guestName}
                          placeholder="來賓姓名"
                          onChange={(v) => updateGuest(i, { guestName: v })}
                        />
                        <IconButton label="移除來賓" onClick={() => removeGuest(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                      <div className="flex items-center gap-2 pl-1">
                        <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full">
                          執事
                        </span>
                        <Input
                          value={g.hostName}
                          placeholder="對應執事姓名"
                          onChange={(v) => updateGuest(i, { hostName: v })}
                        />
                      </div>
                    </div>
                  ))}
                  {draft.guests.length === 0 && (
                    <p className="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-3 text-xs text-foreground/45">
                      本週尚未設定來賓；新增後可填入來賓與對應執事。
                    </p>
                  )}
                </div>
                <div className="mt-3">
                  <TextButton onClick={addGuest} icon={<Plus className="h-3.5 w-3.5" />}>新增來賓</TextButton>
                </div>
              </Section>

              {/* 一般成員 */}
              <Section
                icon={<Users className="h-4 w-4" />}
                title="固定出席成員"
                hint={`${draft.members.length} 位 — 不因拖拉改變順序`}
              >
                <div className="space-y-1.5">
                  {draft.members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={m}
                        onChange={(v) => updateMember(i, v)}
                      />
                      <IconButton label="移除成員" onClick={() => removeMember(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  ))}
                  {draft.members.length === 0 && (
                    <p className="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-3 text-xs text-foreground/45">
                      目前沒有一般成員；可新增後再套用至座位空格。
                    </p>
                  )}
                </div>
                <div className="mt-3">
                    <TextButton onClick={addMember} icon={<Plus className="h-3.5 w-3.5" />}>新增出席成員</TextButton>
                </div>
              </Section>

              {/* 代理人 */}
              <Section
                icon={<UserCog className="h-4 w-4" />}
                title="代理人"
                hint="排於最後排"
              >
                <div className="space-y-1.5">
                  {draft.proxies.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={p} onChange={(v) => updateProxy(i, v)} />
                      <IconButton label="移除代理人" onClick={() => removeProxy(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  ))}
                  {draft.proxies.length === 0 && (
                    <p className="rounded-xl border border-foreground/10 bg-foreground/[0.02] px-3 py-3 text-xs text-foreground/45">
                      本週沒有代理人。
                    </p>
                  )}
                </div>
                <div className="mt-3">
                  <TextButton onClick={addProxy} icon={<Plus className="h-3.5 w-3.5" />}>新增代理人</TextButton>
                </div>
              </Section>

              {/* 產業服務鍊 */}
              {draft.industryChains.length > 0 && (
                <Section
                  icon={<Link2 className="h-4 w-4" />}
                  title="產業服務鍊"
                  hint="BNI 分組規則"
                >
                  <div className="space-y-4">
                    {Object.entries(chainsByGroup).map(([group, chains]) => {
                      const colors = INDUSTRY_GROUP_COLORS[group as 'A' | 'B' | 'C' | 'D'];
                      return (
                        <div key={group} className={`rounded-2xl border p-3 space-y-2 ${colors.panel}`}>
                          <div className={`text-[11px] font-black uppercase tracking-widest ${colors.text}`}>
                            {group} 組
                          </div>
                          {chains.map((c) => (
                            <div key={c.id} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 text-[9px] font-black rounded-sm leading-none ${colors.badge}`}>
                                  {c.id}
                                </span>
                                <span className="text-xs font-semibold text-foreground/80 truncate">{c.name}</span>
                              </div>
                              <textarea
                                rows={2}
                                value={c.members.join(', ')}
                                onChange={(e) => updateChainMembers(c.id, e.target.value)}
                                placeholder="成員姓名（逗號分隔）"
                                className="
                                  w-full px-3 py-2 rounded-lg text-xs resize-none
                                  bg-foreground/[0.04] border border-foreground/10
                                  focus:border-foreground/40 focus:bg-foreground/[0.06]
                                  outline-none transition-colors
                                  placeholder:text-foreground/30
                                "
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-foreground/10 flex gap-3 justify-end bg-background/80 backdrop-blur">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onApply(draft);
                  onClose();
                }}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                套用
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// --- Subcomponents ---

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-md bg-foreground/5 flex items-center justify-center text-foreground/70">
          {icon}
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
        {hint && <span className="text-[11px] text-foreground/40 ml-auto">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-foreground/50 w-16 shrink-0 font-medium">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TextButton({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        inline-flex items-center gap-1.5 rounded-lg border border-foreground/10
        bg-foreground/[0.03] px-3 py-1.5 text-xs font-bold
        hover:bg-foreground/[0.07] transition-colors
      "
    >
      {icon}
      {children}
    </button>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="
        h-9 w-9 shrink-0 rounded-lg border border-foreground/10
        bg-foreground/[0.03] text-foreground/55
        hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300
        transition-colors flex items-center justify-center
      "
    >
      {children}
    </button>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="
        w-full h-9 px-3 rounded-lg text-sm
        bg-foreground/[0.04] border border-foreground/10
        focus:border-foreground/40 focus:bg-foreground/[0.06]
        outline-none transition-colors
        placeholder:text-foreground/30
      "
    />
  );
}
