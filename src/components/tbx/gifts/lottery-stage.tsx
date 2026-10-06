'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { stageDrawAction, stageRedrawAction } from '@/app/(public)/e/[eventKey]/lottery/actions';
import { winnerKindChip, winnerKindLabel, type StageDrawResult, type StageGift, type StageWinner } from '@/components/tbx/gifts/labels';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'rolling' | 'revealed';
type Shown = { awardId: string; name: string; kind: string | null };

/** Names cycle quickly for at least this long, then slow down and stop. */
const FAST_MS = 1700;
const FAST_STEP_MS = 70;
const SLOW_STEPS_MS = [110, 150, 200, 260, 340];
const REFRESH_MS = 15000;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function shuffle(names: string[]) {
  const list = [...names];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * Cycles through the names quickly until the server has answered and the minimum
 * time has passed, then slows down. The winner is revealed by the caller.
 */
async function rollNames(names: string[], show: (name: string) => void, status: () => 'waiting' | 'ok' | 'stop') {
  if (names.length < 2) return;
  const startedAt = Date.now();
  let index = 0;
  const step = async (delay: number) => {
    index = (index + 1) % names.length;
    show(names[index]);
    await sleep(delay);
  };

  while (status() === 'waiting' || (status() === 'ok' && Date.now() - startedAt < FAST_MS)) {
    await step(FAST_STEP_MS);
  }
  for (const delay of SLOW_STEPS_MS) {
    if (status() !== 'ok') return;
    await step(delay);
  }
}

/** Font size that keeps a name on one line of the name area: full-width characters count as 1, others as about half. */
export function stageNameSize(name: string) {
  let units = 0;
  for (const char of name) units += /[⺀-鿿豈-﫿＀-￯]/.test(char) ? 1 : 0.58;
  const width = Math.max(4, Math.min(24, 86 / Math.max(units, 3)));
  return `clamp(34px, min(${width.toFixed(1)}cqw, 30vh), 300px)`;
}

export function LotteryStage({
  eventKey,
  eventTitle,
  eventDate,
  gifts,
  winners,
  poolSize,
  poolNames,
}: {
  eventKey: string;
  eventTitle: string;
  eventDate: string;
  gifts: StageGift[];
  winners: StageWinner[];
  poolSize: number;
  /** Names only, for the rolling animation. The winner is always picked on the server. */
  poolNames: string[];
}) {
  const router = useRouter();
  const ordered = useMemo(
    () => [...gifts.filter((gift) => gift.remaining > 0), ...gifts.filter((gift) => gift.remaining === 0)],
    [gifts],
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => ordered[0]?.id ?? null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [confirm, setConfirm] = useState<null | 'draw' | 'redraw'>(null);
  const [rollName, setRollName] = useState('');
  const [result, setResult] = useState<Shown | null>(null);
  const [error, setError] = useState<string | null>(null);
  // While names are rolling the server data may already contain the result; keep showing the list from before.
  const [frozenWinners, setFrozenWinners] = useState<StageWinner[] | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Pick up new check-ins and changes made on the console. Paused while rolling.
  useEffect(() => {
    if (phase === 'rolling') return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [phase, router]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const selected = gifts.find((gift) => gift.id === selectedId) ?? ordered[0] ?? null;
  const rolling = phase === 'rolling';
  const hasRemaining = gifts.some((gift) => gift.remaining > 0);

  let shown: Shown | null = null;
  if (phase === 'revealed' && result) {
    // Prefer the live record so a change made on the console shows up here too.
    shown = selected?.winners.find((winner) => winner.awardId === result.awardId) ?? result;
  } else if (phase === 'idle' && selected && selected.remaining === 0) {
    shown = selected.winners[selected.winners.length - 1] ?? null;
  }
  // Hidden while rolling: the refreshed data may already name the new winner.
  const earlier = selected && !rolling ? selected.winners.filter((winner) => winner.awardId !== shown?.awardId) : [];
  const canDraw = phase === 'idle' && Boolean(selected) && (selected?.remaining ?? 0) > 0;
  const listed = frozenWinners ?? winners;

  async function run(kind: 'draw' | 'redraw') {
    if (!selected || rolling) return;
    const giftId = selected.id;
    const target = kind === 'redraw' ? shown : null;
    if (kind === 'redraw' && !target) return;

    const previousPhase = phase;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const names = shuffle(target ? poolNames.filter((name) => name !== target.name) : poolNames);

    setSelectedId(giftId);
    setConfirm(null);
    setError(null);
    setFrozenWinners(winners);
    setRollName(reduced ? '' : names[0] ?? '');
    setPhase('rolling');

    const box: { value: StageDrawResult | null } = { value: null };
    const request = (target ? stageRedrawAction(eventKey, target.awardId) : stageDrawAction(eventKey, giftId))
      .catch((): StageDrawResult => ({ ok: false, message: '連線失敗，不確定有沒有抽出。請看右側得主名單確認後再操作。' }))
      .then((value) => {
        box.value = value;
        return value;
      });

    // People who prefer reduced motion skip the rolling and go straight to the result.
    if (!reduced) {
      await rollNames(names, setRollName, () => (!aliveRef.current ? 'stop' : !box.value ? 'waiting' : box.value.ok ? 'ok' : 'stop'));
    }

    const outcome = await request;
    if (!aliveRef.current) return;
    setFrozenWinners(null);
    if (outcome.ok) {
      setResult({ awardId: outcome.awardId, name: outcome.winnerName, kind: outcome.winnerKind });
      setPhase('revealed');
    } else {
      setError(outcome.message);
      setPhase(previousPhase === 'revealed' ? 'revealed' : 'idle');
      router.refresh();
    }
  }

  function selectGift(id: string) {
    setSelectedId(id);
    setResult(null);
    setPhase('idle');
    setConfirm(null);
    setError(null);
  }

  function next() {
    const target = selected && selected.remaining > 0 ? selected : ordered.find((gift) => gift.remaining > 0);
    selectGift(target?.id ?? selected?.id ?? '');
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  const bigName = rolling ? rollName : shown?.name ?? '';

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-tb-line px-5 py-3">
        <div className="min-w-0">
          <p className="tb-eyebrow">禮物抽獎・{eventDate}</p>
          <h1 className="text-lg font-bold leading-tight">{eventTitle}</h1>
        </div>
        <button type="button" className="tb-btn tb-btn-quiet tb-btn-sm" onClick={toggleFullscreen}>
          {fullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Maximize className="h-4 w-4" aria-hidden="true" />}
          {fullscreen ? '離開全螢幕' : '全螢幕'}
        </button>
      </header>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-w-0 flex-col items-center justify-center gap-6 px-5 py-8 text-center" aria-label="抽獎舞台">
          {selected ? (
            <>
              <div className="flex flex-col items-center gap-2">
                <p className="tb-eyebrow">{selected.quantity > 1 ? `目前禮物・共 ${selected.quantity} 份` : '目前禮物'}</p>
                <h2 className="break-words font-bold leading-tight" style={{ fontSize: 'clamp(28px, 5vw, 72px)' }}>
                  {selected.name}
                </h2>
                <p className="text-tb-muted" style={{ fontSize: 'clamp(15px, 1.8vw, 26px)' }}>
                  提供者：{selected.donor ?? '未登記'}
                  <span className="mx-3 text-tb-faint">|</span>
                  抽獎池 <span className="tb-num font-semibold text-tb-text">{poolSize}</span> 人
                </p>
              </div>

              <div
                className="flex min-h-[34vh] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-tb-line bg-tb-surf px-4 py-6"
                style={{ containerType: 'inline-size' }}
              >
                {bigName ? (
                  <>
                    <p className="tb-eyebrow">{rolling ? '抽獎中' : '得主'}</p>
                    <p
                      className={cn(
                        'max-w-full break-words font-black leading-none transition-transform duration-500',
                        rolling ? 'scale-90 text-tb-muted' : 'scale-100 text-tb-text',
                      )}
                      style={{ fontSize: stageNameSize(bigName) }}
                      aria-hidden={rolling}
                    >
                      {bigName}
                    </p>
                    {!rolling && shown ? <span className={winnerKindChip(shown.kind)}>{winnerKindLabel(shown.kind)}</span> : null}
                  </>
                ) : (
                  <p className="text-tb-faint" style={{ fontSize: 'clamp(18px, 3cqw, 40px)' }}>
                    {rolling ? '抽獎中…' : poolSize === 0 ? '抽獎池還沒有人，請先完成簽到' : '按「開抽」抽出得主'}
                  </p>
                )}
              </div>

              <p className="sr-only" role="status" aria-live="polite">
                {!rolling && shown ? `${selected.name} 的得主是 ${shown.name}` : ''}
              </p>

              {earlier.length > 0 ? (
                <p className="text-sm text-tb-muted">
                  這份禮物的其他得主：{earlier.map((winner) => winner.name).join('、')}
                </p>
              ) : null}

              <div className="flex w-full max-w-xl flex-col items-center gap-3">
                <label className="tb-label w-full text-left" htmlFor="stage-gift">
                  要抽的禮物
                  <select
                    id="stage-gift"
                    className="tb-select min-h-[44px]"
                    value={selected.id}
                    disabled={rolling}
                    onChange={(event) => selectGift(event.target.value)}
                  >
                    {ordered.map((gift) => (
                      <option key={gift.id} value={gift.id}>
                        {gift.name}
                        {gift.quantity > 1 ? ` ×${gift.quantity}` : ''}
                        {gift.remaining === 0 ? '（已抽完）' : gift.quantity > 1 ? `（剩 ${gift.remaining} 份）` : '（待抽）'}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {rolling ? (
                    <button type="button" className="tb-btn tb-btn-gold tb-btn-lg" disabled>
                      抽獎中…
                    </button>
                  ) : null}

                  {canDraw && confirm !== 'draw' ? (
                    <button
                      type="button"
                      className="tb-btn tb-btn-gold tb-btn-lg min-w-[160px]"
                      disabled={poolSize === 0}
                      onClick={() => setConfirm('draw')}
                    >
                      開抽
                    </button>
                  ) : null}
                  {canDraw && confirm === 'draw' ? (
                    <>
                      <button type="button" className="tb-btn tb-btn-gold tb-btn-lg" onClick={() => void run('draw')}>
                        確定開抽
                      </button>
                      <button type="button" className="tb-btn tb-btn-quiet tb-btn-lg" onClick={() => setConfirm(null)}>
                        取消
                      </button>
                    </>
                  ) : null}

                  {!rolling && shown && confirm !== 'redraw' ? (
                    <button type="button" className="tb-btn tb-btn-outline tb-btn-lg" onClick={() => setConfirm('redraw')}>
                      重抽
                    </button>
                  ) : null}
                  {!rolling && shown && confirm === 'redraw' ? (
                    <>
                      <button type="button" className="tb-btn tb-btn-outline tb-btn-lg" onClick={() => void run('redraw')}>
                        確定重抽
                      </button>
                      <button type="button" className="tb-btn tb-btn-quiet tb-btn-lg" onClick={() => setConfirm(null)}>
                        取消
                      </button>
                    </>
                  ) : null}

                  {!rolling && shown && confirm === null && hasRemaining ? (
                    <button type="button" className="tb-btn tb-btn-lg" onClick={next}>
                      下一份
                    </button>
                  ) : null}
                </div>

                {confirm === 'redraw' && shown ? (
                  <p className="text-sm text-tb-muted">重抽後，{shown.name} 的結果會留在紀錄裡，並從這份禮物的抽獎池排除。</p>
                ) : null}
                {!rolling && shown && !hasRemaining ? <p className="text-sm text-tb-muted">所有禮物都抽完了。</p> : null}
                {error ? (
                  <p role="alert" className="tb-form-error">
                    {error}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xl font-bold">這場活動還沒有禮物</p>
              <p className="max-w-[44ch] text-sm text-tb-muted">請先到領導團隊中控的「禮物」頁新增禮物，這裡會自動出現。</p>
            </div>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-3 border-t border-tb-line p-5 lg:border-l lg:border-t-0" aria-label="得主名單">
          <h2 className="text-sm font-bold">
            得主名單 <span className="tb-mono text-tb-faint">{listed.length}</span>
          </h2>
          {listed.length === 0 ? (
            <p className="text-sm text-tb-faint">還沒有人中獎。</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {listed.map((winner) => (
                <li key={winner.awardId} className="flex flex-col gap-0.5 rounded-lg border border-tb-line bg-tb-surf px-3 py-2">
                  <span className="text-base font-bold">{winner.winnerName}</span>
                  <span className="text-xs text-tb-muted">
                    {winner.giftName}
                    {winner.donor ? `・${winner.donor} 提供` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
