'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { signIn, useSession } from 'next-auth/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSwappingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SeatingLayout,
  SeatData,
  Roster,
  GuestPair,
  IndustryChain,
  MeetingWeek,
  SeatingWorkspaceState,
  SeatingValidationIssue,
} from '../types/seating';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  Printer,
  RotateCcw,
  Save,
  Settings2,
  Trophy,
  BookOpen,
} from 'lucide-react';
import { RuleEditor } from './RuleEditor';
import {
  DEFAULT_INDUSTRY_CHAINS,
  INDUSTRY_GROUP_COLORS,
  buildPersonChainIndex,
} from '@/lib/industry-chains';
import { localSeatingWorkspaceRepository } from '@/lib/seating-storage';
import { buildSeatingCsv, downloadTextFile } from '@/lib/seating-export';
import { getSeatCoordinate, validateSeatingWorkspace } from '@/lib/seating-validation';
import { CHAPTER_MEMBER_DIRECTORY } from '@/lib/chapter-members';

// --- Sortable Seat Component ---
function SortableSeat({
  seat,
  id,
  chainIds,
}: {
  seat: SeatData | null;
  id: string;
  chainIds?: string[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  if (!seat) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full h-20 border-2 border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--background)] opacity-30"
      />
    );
  }

  const isHost = seat.isHost;
  const isSound = seat.isSound;
  const isDuty = seat.isDuty;
  const isProxy = seat.role === '代理';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative w-full h-20 flex flex-col items-center justify-center rounded-2xl cursor-grab active:cursor-grabbing
        transition-all duration-500 group
        ${seat.isGuest
          ? 'bg-indigo-500/10 border-2 border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
          : isHost
            ? 'bg-amber-500/10 border-2 border-amber-500/25'
            : isProxy
              ? 'bg-gray-100 dark:bg-gray-700/40 border border-gray-300/70 dark:border-gray-500/40'
              : 'bg-[var(--card-bg)] border border-[var(--card-border)]'}
        hover:border-indigo-500/30 hover:bg-[var(--card-bg)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.1)]
        ${isDragging ? 'scale-105 rotate-2 shadow-2xl z-50' : ''}
      `}
    >
      {/* Top-right tag: 賓X / 執-賓X / 代理 */}
      {seat.isGuest && (
        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
          <span className="px-2 py-0.5 bg-indigo-500 text-[9px] font-black text-white rounded-full shadow-lg uppercase tracking-tighter">
            {seat.guestNumber}
          </span>
        </div>
      )}
      {isHost && (
        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
          <span className="px-2 py-0.5 bg-amber-500 text-[9px] font-black text-white rounded-full shadow-lg uppercase tracking-tighter">
            執{seat.hostFor ? `·${seat.hostFor}` : ''}
          </span>
        </div>
      )}
      {isProxy && (
        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
          <span className="px-2 py-0.5 bg-gray-400 dark:bg-gray-500 text-[9px] font-black text-white rounded-full shadow-lg tracking-tighter">
            代理
          </span>
        </div>
      )}

      {/* Top-left tag: 音控 / 值日 */}
      {(isSound || isDuty) && (
        <div className="absolute top-0 left-0 transform -translate-x-1/4 -translate-y-1/4">
          <span className={`px-2 py-0.5 text-[9px] font-black text-white rounded-full shadow-lg uppercase tracking-tighter ${
            isSound ? 'bg-sky-500' : 'bg-emerald-500'
          }`}>
            {isSound ? '音控' : '值日'}
          </span>
        </div>
      )}

      <span className="text-base font-bold tracking-tight text-[var(--foreground)] opacity-90 group-hover:opacity-100 transition-opacity">
        {seat.name}
      </span>

      {/* Industry chain tags */}
      {chainIds && chainIds.length > 0 && (
        <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5 justify-center pointer-events-none">
          {chainIds.map((cid) => {
            const group = cid[0] as 'A' | 'B' | 'C' | 'D';
            const colors = INDUSTRY_GROUP_COLORS[group];
            return (
              <span
                key={cid}
                className={`px-1 py-[1px] text-[8px] font-black rounded-sm leading-none tracking-tight ${colors?.badge ?? 'bg-foreground/30 text-white'}`}
              >
                {cid}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Roster <-> SeatData helpers ---

const HOST_TEAM_ROLES = ['活動協調', '財務秘書', '主席', '副主席', '教育協調'];
const GRID_COLUMNS = 4;

function createSeatId(prefix: string, index: number) {
  return `${prefix}-${Date.now()}-${index}`;
}

function ensureIndex(items: (SeatData | null)[], index: number) {
  while (items.length <= index) items.push(null);
}

function ensureFullRows(items: (SeatData | null)[]) {
  while (items.length % GRID_COLUMNS !== 0) items.push(null);
}

function findEmptyGuestPair(items: (SeatData | null)[]) {
  ensureFullRows(items);
  for (let i = 0; i < items.length; i++) {
    const below = i + GRID_COLUMNS;
    if (items[i] === null && (items[below] === null || items[below] === undefined)) {
      ensureIndex(items, below);
      return { guestIndex: i, hostIndex: below };
    }
  }

  const guestIndex = items.length;
  for (let i = 0; i < GRID_COLUMNS * 2; i++) items.push(null);
  return { guestIndex, hostIndex: guestIndex + GRID_COLUMNS };
}

function placeInFirstEmpty(items: (SeatData | null)[], seat: SeatData) {
  const emptyIndex = items.findIndex((item) => item === null);
  if (emptyIndex >= 0) {
    items[emptyIndex] = seat;
    return;
  }

  ensureFullRows(items);
  items.push(seat);
  ensureFullRows(items);
}

function buildRoster(
  topRoles: SeatData[],
  items: (SeatData | null)[],
  industryChains: IndustryChain[],
  heroes: string[],
  memberRoster: string[],
): Roster {
  const hostTeam = HOST_TEAM_ROLES.map((role) => {
    const t = topRoles.find((r) => r.role === role);
    return { role, name: t?.name ?? '' };
  });

  const sound = items.find((s) => s?.isSound)?.name ?? '';
  const duty = items.find((s) => s?.isDuty)?.name ?? '';

  // Build 9 guest pairs sorted by guest number
  const guestSeats = items.filter((s): s is SeatData => !!s?.isGuest);
  const guests: GuestPair[] = guestSeats
    .map((g) => {
      const host = items.find((s) => s?.isHost && s.hostFor === g.guestNumber);
      return { number: g.guestNumber!, guestName: g.name, hostName: host?.name ?? '' };
    })
    .sort((a, b) => parseInt(a.number.replace('賓', '')) - parseInt(b.number.replace('賓', '')));

  const proxies = items
    .filter((s): s is SeatData => !!s && s.role === '代理')
    .map((s) => s.name);

  return { hostTeam, sound, duty, guests, members: memberRoster, proxies, industryChains, heroes };
}

function applyRoster(
  topRoles: SeatData[],
  items: (SeatData | null)[],
  next: Roster,
): { topRoles: SeatData[]; items: (SeatData | null)[]; heroes: string[]; memberRoster: string[] } {
  // Top roles: replace by role match
  const newTopRoles = topRoles.map((t) => {
    const match = next.hostTeam.find((m) => m.role === t.role);
    return match ? { ...t, name: match.name } : t;
  });

  let proxyCursor = 0;

  const newItems = items.map((s) => {
    if (!s) return s;
    if (s.isGuest) {
      const g = next.guests.find((x) => x.number === s.guestNumber);
      return g ? { ...s, name: g.guestName } : s;
    }
    if (s.isHost) {
      const g = next.guests.find((x) => x.number === s.hostFor);
      return g ? { ...s, name: g.hostName } : s;
    }
    if (s.isSound) return { ...s, name: next.sound };
    if (s.isDuty) return { ...s, name: next.duty };
    if (s.role === '代理') {
      const v = next.proxies[proxyCursor++] ?? s.name;
      return { ...s, name: v };
    }
    return s;
  });

  const placedGuestNumbers = new Set(
    newItems.filter((s): s is SeatData => Boolean(s?.isGuest && s.guestNumber)).map((s) => s.guestNumber!),
  );

  for (const guest of next.guests) {
    if (placedGuestNumbers.has(guest.number)) continue;
    const { guestIndex, hostIndex } = findEmptyGuestPair(newItems);
    newItems[guestIndex] = {
      id: createSeatId('guest', guestIndex),
      name: guest.guestName,
      isGuest: true,
      guestNumber: guest.number,
    };
    newItems[hostIndex] = {
      id: createSeatId('host', hostIndex),
      name: guest.hostName,
      isGuest: false,
      isHost: true,
      hostFor: guest.number,
    };
  }

  const seatedMemberNames = new Set(
    newItems
      .filter((s): s is SeatData => {
        if (!s) return false;
        if (s.isGuest) return false;
        if (s.role === '代理') return false;
        // Hosts, sound, and duty ARE seated members, so we must include them!
        return true;
      })
      .map((s) => s.name.trim())
      .filter(Boolean),
  );

  for (let i = 0; i < next.members.length; i++) {
    const name = next.members[i].trim();
    if (!name || seatedMemberNames.has(name)) continue;
    placeInFirstEmpty(newItems, {
      id: createSeatId('member', i),
      name,
      isGuest: false,
    });
  }

  for (let i = proxyCursor; i < next.proxies.length; i++) {
    const name = next.proxies[i].trim();
    if (!name) continue;
    placeInFirstEmpty(newItems, {
      id: createSeatId('proxy', i),
      name,
      isGuest: false,
      role: '代理',
    });
  }

  ensureFullRows(newItems);

  return { topRoles: newTopRoles, items: newItems, heroes: next.heroes, memberRoster: next.members };
}

function createStateSnapshot(
  week: MeetingWeek,
  topRoles: SeatData[],
  items: (SeatData | null)[],
  memberRoster: string[],
  heroes: string[],
  industryChains: IndustryChain[],
): SeatingWorkspaceState {
  return {
    week,
    topRoles,
    items,
    memberRoster,
    heroes,
    industryChains,
    updatedAt: new Date().toISOString(),
  };
}

function restoreInitialState(initialLayout: SeatingLayout, initialHeroes: string[], initialMemberRoster: string[]) {
  return {
    topRoles: initialLayout.topRoles,
    items: initialLayout.mainGrid.flat(),
    industryChains: DEFAULT_INDUSTRY_CHAINS,
    heroes: initialHeroes,
    memberRoster: initialMemberRoster,
  };
}

function ValidationIssueCard({ issue }: { issue: SeatingValidationIssue }) {
  const styles = {
    error: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200',
  };
  const Icon = issue.severity === 'info' ? Info : AlertTriangle;

  return (
    <li className={`rounded-lg border px-3 py-2 ${styles[issue.severity]}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span>{issue.title}</span>
            {issue.seatIndex !== undefined && (
              <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                {getSeatCoordinate(issue.seatIndex)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed opacity-80">{issue.message}</p>
        </div>
      </div>
    </li>
  );
}

// --- Main Arranger Component ---
export default function SeatingArranger({
  initialLayout,
  initialHeroes = [],
  initialMemberRoster,
  week,
}: {
  initialLayout: SeatingLayout;
  initialHeroes?: string[];
  initialMemberRoster: string[];
  week: MeetingWeek;
}) {
  const [topRoles, setTopRoles] = useState<SeatData[]>(initialLayout.topRoles);
  const [items, setItems] = useState<(SeatData | null)[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [industryChains, setIndustryChains] = useState<IndustryChain[]>(DEFAULT_INDUSTRY_CHAINS);
  const [heroes, setHeroes] = useState<string[]>(initialHeroes);
  const [memberRoster, setMemberRoster] = useState<string[]>(initialMemberRoster);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [remoteSaveStatus, setRemoteSaveStatus] = useState<'idle' | 'local' | 'saving' | 'saved' | 'error'>('idle');
  const [remoteSaveMessage, setRemoteSaveMessage] = useState<string | null>(null);
  const { status: authStatus } = useSession();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localSeatingWorkspaceRepository.load(week.id);
      if (saved) {
        setTopRoles(saved.topRoles);
        setItems(saved.items);
        setIndustryChains(saved.industryChains.length ? saved.industryChains : DEFAULT_INDUSTRY_CHAINS);
        setHeroes(saved.heroes);
        setMemberRoster(saved.memberRoster?.length ? saved.memberRoster : initialMemberRoster);
        setLastSavedAt(saved.updatedAt);
      } else {
        const restored = restoreInitialState(initialLayout, initialHeroes, initialMemberRoster);
        setTopRoles(restored.topRoles);
        setItems(restored.items);
        setIndustryChains(restored.industryChains);
        setHeroes(restored.heroes);
        setMemberRoster(restored.memberRoster);
        setLastSavedAt(null);
      }
      setDirty(false);
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialLayout, initialHeroes, initialMemberRoster, week.id]);

  const personChainIndex = useMemo(() => buildPersonChainIndex(industryChains), [industryChains]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((_, idx) => `seat-${idx}` === active.id);
        const newIndex = prev.findIndex((_, idx) => `seat-${idx}` === over.id);
        const next = [...prev];
        [next[oldIndex], next[newIndex]] = [next[newIndex], next[oldIndex]];
        setDirty(true);
        return next;
      });
    }
    setActiveId(null);
  };

  const activeSeat = activeId ? items[parseInt(activeId.split('-')[1])] : null;

  const roster = useMemo(
    () => buildRoster(topRoles, items, industryChains, heroes, memberRoster),
    [topRoles, items, industryChains, heroes, memberRoster],
  );

  const validation = useMemo(
    () => validateSeatingWorkspace({ topRoles, items, industryChains }),
    [topRoles, items, industryChains],
  );

  const currentState = useMemo(
    () => createStateSnapshot(week, topRoles, items, memberRoster, heroes, industryChains),
    [week, topRoles, items, memberRoster, heroes, industryChains],
  );

  const occupiedCount = useMemo(() => items.filter(Boolean).length, [items]);
  const guestCount = useMemo(() => items.filter((seat) => seat?.isGuest).length, [items]);
  const proxyCount = useMemo(() => items.filter((seat) => seat?.role === '代理').length, [items]);

  const handleApplyRoster = (next: Roster) => {
    const { topRoles: nt, items: ni, heroes: nh, memberRoster: nm } = applyRoster(topRoles, items, next);
    setTopRoles(nt);
    setItems(ni);
    setIndustryChains(next.industryChains);
    setHeroes(nh);
    setMemberRoster(nm);
    setDirty(true);
  };

  const handleSave = async () => {
    const savedAt = new Date().toISOString();
    localSeatingWorkspaceRepository.save(currentState);
    setLastSavedAt(savedAt);
    setDirty(false);

    if (authStatus !== 'authenticated') {
      setRemoteSaveStatus('local');
      setRemoteSaveMessage('已保存本機草稿；Google 登入後可同步 MongoDB。');
      return;
    }

    setRemoteSaveStatus('saving');
    setRemoteSaveMessage(null);

    try {
      const response = await fetch(`/api/seats/${encodeURIComponent(week.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace: { ...currentState, updatedAt: savedAt },
          validationSummary: validation,
          reason: 'Saved from seating workspace UI.',
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message ?? 'MongoDB 草稿保存失敗。');
      }
      setRemoteSaveStatus('saved');
      setRemoteSaveMessage(`MongoDB 草稿已保存：v${result.version}`);
    } catch (error) {
      setRemoteSaveStatus('error');
      setRemoteSaveMessage(error instanceof Error ? error.message : 'MongoDB 草稿保存失敗。');
    }
  };

  const handleReset = () => {
    const restored = restoreInitialState(initialLayout, initialHeroes, initialMemberRoster);
    localSeatingWorkspaceRepository.clear(week.id);
    setTopRoles(restored.topRoles);
    setItems(restored.items);
    setIndustryChains(restored.industryChains);
    setHeroes(restored.heroes);
    setMemberRoster(restored.memberRoster);
    setLastSavedAt(null);
    setDirty(false);
    setRemoteSaveStatus('idle');
    setRemoteSaveMessage(null);
  };

  const handleExportCSV = () => {
    const csv = buildSeatingCsv(currentState);
    downloadTextFile(`${week.id}-${week.chapterName}-座位表.csv`, csv, 'text/csv;charset=utf-8');
  };

  const handleExportPDF = () => {
    localStorage.setItem(
      'print-state',
      JSON.stringify(currentState),
    );
    window.open('/seats/print', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 pb-12">
      {/* Controls — hidden during print */}
      <div className="no-print mb-6 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
        <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-foreground/40">
                {week.chapterName}
              </div>
              <h2 className="mt-1 text-xl font-bold">{week.meetingLabel}</h2>
              <p className="mt-1 text-sm text-foreground/50">
                {storageReady && lastSavedAt
                  ? `本機草稿已保存：${new Date(lastSavedAt).toLocaleString('zh-TW')}`
                  : '尚未建立本機草稿，保存後會留在此瀏覽器。'}
              </p>
              {remoteSaveMessage && (
                <p className={`mt-1 text-xs ${
                  remoteSaveStatus === 'error'
                    ? 'text-red-600 dark:text-red-300'
                    : remoteSaveStatus === 'local'
                      ? 'text-amber-600 dark:text-amber-300'
                      : 'text-emerald-600 dark:text-emerald-300'
                }`}>
                  {remoteSaveMessage}
                </p>
              )}
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
              dirty ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
            }`}>
              {dirty ? <Info className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {dirty ? '有未保存變更' : '目前已同步'}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Metric label="規則分數" value={validation.score} />
            <Metric label="座位人數" value={occupiedCount} />
            <Metric label="來賓" value={guestCount} />
            <Metric label="代理" value={proxyCount} />
            <Metric label="固定成員" value={memberRoster.length} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton
              onClick={handleSave}
              icon={<Save className="h-4 w-4" />}
              label={remoteSaveStatus === 'saving' ? '保存中...' : authStatus === 'authenticated' ? '保存並同步' : '保存本機'}
              primary
              disabled={remoteSaveStatus === 'saving'}
            />
            {authStatus === 'unauthenticated' && (
              <ActionButton onClick={() => signIn('google')} icon={<Info className="h-4 w-4" />} label="登入同步" />
            )}
            <ActionButton onClick={handleReset} icon={<RotateCcw className="h-4 w-4" />} label="重設本週" />
            <ActionButton onClick={handleExportCSV} icon={<Download className="h-4 w-4" />} label="匯出 CSV" />
            <ActionButton onClick={handleExportPDF} icon={<Printer className="h-4 w-4" />} label="匯出 PDF" />
            <ActionButton onClick={() => setEditorOpen(true)} icon={<Settings2 className="h-4 w-4" />} label="編輯規則" />
          </div>
        </section>

        <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em]">規則檢查</h3>
              <p className="mt-1 text-xs text-foreground/45">
                Error {validation.counts.error} / Warning {validation.counts.warning} / Info {validation.counts.info}
              </p>
            </div>
            <div className={`rounded-full px-2.5 py-1 text-xs font-black ${
              validation.counts.error > 0
                ? 'bg-red-500/15 text-red-700 dark:text-red-200'
                : validation.counts.warning > 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
            }`}>
              {validation.counts.error > 0 ? '需處理' : validation.counts.warning > 0 ? '需確認' : '通過'}
            </div>
          </div>
          {validation.issues.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              本週座位符合目前規則檢查。
            </div>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {validation.issues.slice(0, 6).map((issue) => (
                <ValidationIssueCard key={issue.id} issue={issue} />
              ))}
            </ul>
          )}
        </section>

        <RuleReference />
        <MemberDirectory memberRoster={memberRoster} />
      </div>

      {/* Capture area for PDF export */}
      <div id="seating-print-area">

      {/* Hero Board */}
      {heroes.length > 0 && (
        <div className="mb-10 rounded-3xl border-2 border-yellow-500/50 dark:border-yellow-400/60 bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 dark:from-yellow-400/10 dark:via-amber-300/10 dark:to-yellow-400/10 p-5 shadow-[0_0_40px_rgba(251,191,36,0.15)]">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-6 h-6 text-yellow-500 dark:text-yellow-400" />
            <span className="text-base font-black uppercase tracking-[0.25em] text-yellow-600 dark:text-yellow-400">本週英雄榜</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {heroes.map((name, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black tracking-widest text-yellow-600 dark:text-yellow-500">英{i + 1}</span>
                  <div className="px-5 py-2.5 rounded-2xl bg-amber-500 dark:bg-yellow-400/20 border-2 border-amber-500 dark:border-yellow-400/50 shadow-[0_0_16px_rgba(251,191,36,0.25)]">
                    <span className="text-base font-black text-white dark:text-yellow-300">{name}</span>
                  </div>
                </div>
                {i < heroes.length - 1 && (
                  <span className="text-amber-500 dark:text-yellow-400/60 text-xl font-bold mt-3">›</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Top Roles */}
      <div className="grid grid-cols-5 gap-6 mb-16">
        {topRoles.map((role, idx) => {
          const colors = [
            'bg-green-500/20 border-green-500/40 text-green-800 dark:text-green-100',
            'bg-amber-500/20 border-amber-500/40 text-amber-800 dark:text-amber-100',
            'bg-sky-500/20 border-sky-500/40 text-sky-800 dark:text-sky-100',
            'bg-rose-500/20 border-rose-500/40 text-rose-800 dark:text-rose-100',
            'bg-orange-500/20 border-orange-500/40 text-orange-800 dark:text-orange-100',
          ];
          return (
            <div key={role.id} className="flex flex-col items-center">
              <div className="text-[12px] uppercase tracking-[0.2em] text-foreground/50 mb-3 font-bold">
                {role.role}
              </div>
              <div className={`w-full h-16 glass-panel flex items-center justify-center border-2 ${colors[idx % colors.length]}`}>
                <span className="text-lg font-bold">{role.name}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-8">
        {/* Main Grid */}
        <div className="flex-grow">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((_, i) => `seat-${i}`)} strategy={rectSwappingStrategy}>
              <div className="grid grid-cols-4 gap-4 bg-[var(--foreground)]/[0.02] p-8 rounded-[40px] border border-[var(--card-border)] shadow-inner">
                {items.map((seat, i) => (
                  <SortableSeat
                    key={`seat-${i}`}
                    id={`seat-${i}`}
                    seat={seat}
                    chainIds={seat ? personChainIndex.get(seat.name.trim()) : undefined}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: { opacity: '0.5' },
                },
              }),
            }}>
              {activeId ? (
                <div className={`
                  w-full h-16 flex flex-col items-center justify-center rounded-xl border border-foreground/30 bg-foreground/10 backdrop-blur-xl shadow-2xl
                  ${activeSeat?.isGuest ? 'bg-indigo-500/40 border-indigo-500/50' : ''}
                `}>
                  <span className="text-sm font-bold text-foreground">{activeSeat?.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Sidebar */}
        {initialLayout.sidebar.length > 0 && (
          <div className="w-56 flex flex-col gap-4">
            <div className="text-xs font-black text-foreground/40 mb-2 uppercase tracking-[0.3em] pl-2">其他人員</div>
            <div className="space-y-2">
              {initialLayout.sidebar.map((item) => (
                <div key={item.id} className="h-12 glass-panel flex items-center px-4 gap-4 text-sm hover:bg-foreground/5 transition-all group">
                  <div className="w-2 h-2 rounded-full bg-foreground/20 group-hover:bg-indigo-400 transition-colors" />
                  <span className="flex-grow text-foreground/50 font-medium">{item.role}</span>
                  <span className="font-bold text-foreground/90">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      </div>{/* end #seating-print-area */}

      <div className="mt-12 flex justify-between items-center text-foreground/30 text-[10px] no-print">
        <div>BNI 長冠軍分會營運系統 · 排座模組 v0.2</div>
        <div>拖移卡片即可調整座位安排，本機保存會保留在此瀏覽器</div>
      </div>

      <RuleEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        roster={roster}
        onApply={handleApplyRoster}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-background/50 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

function RuleReference() {
  const rules = [
    '主持團固定顯示於上方，不排入主座位網格。',
    '值日生目前基準位置：列 0・欄 3。',
    '音控目前基準位置：列 1・欄 3。',
    '來賓盡量靠前，執事坐在對應來賓正後方。',
    '值日生正後方不可安排來賓。',
    'A/B/C/D 產業服務鍊優先集中在同一張長桌，跨桌需人工確認。',
    '固定出席成員名單是資料來源；拖拉只改座位，不改名單。',
  ];

  return (
    <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-foreground/60" />
        <h3 className="text-sm font-black uppercase tracking-[0.18em]">規則基準</h3>
      </div>
      <ul className="space-y-2 text-xs leading-relaxed text-foreground/60">
        {rules.map((rule) => (
          <li key={rule} className="rounded-lg border border-foreground/10 bg-background/35 px-3 py-2">
            {rule}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MemberDirectory({ memberRoster }: { memberRoster: string[] }) {
  const activeSet = new Set(memberRoster.map((name) => name.trim()).filter(Boolean));

  return (
    <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.18em]">成員列表</h3>
          <p className="mt-1 text-xs text-foreground/45">
            分會名冊 {CHAPTER_MEMBER_DIRECTORY.length} 人 / 本週固定出席 {activeSet.size} 人
          </p>
        </div>
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {CHAPTER_MEMBER_DIRECTORY.map((member) => {
          const active = activeSet.has(member.name);
          return (
            <div
              key={member.name}
              className={`
                rounded-lg border px-3 py-2 text-xs
                ${active
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : 'border-foreground/10 bg-background/35 opacity-65'}
              `}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{member.name}</span>
                <span className="shrink-0 text-[10px] text-foreground/45">{member.adminGroup}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {member.roles.map((role) => (
                  <span key={role} className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] text-foreground/55">
                    {role}
                  </span>
                ))}
                {member.note && (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-200">
                    {member.note}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        ${primary
          ? 'bg-foreground text-background hover:opacity-90'
          : 'border border-foreground/15 bg-background/40 hover:bg-foreground/[0.07]'}
      `}
    >
      {icon}
      {label}
    </button>
  );
}
