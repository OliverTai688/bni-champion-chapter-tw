'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { stageRedrawAction, stageSpinGiftAction } from '@/app/(public)/e/[eventKey]/lottery/actions';
import { winnerKindChip, winnerKindLabel, type StageDrawResult, type StageGift, type StageWinner } from '@/components/tbx/gifts/labels';
import { cn } from '@/lib/utils';

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

type SpinPhase = 'idle' | 'rollingGift' | 'rollingWinner' | 'revealed';
type SpinResult = { awardId: string; giftId: string; giftName: string; name: string; kind: string | null };

export function LotteryStage({
  eventKey,
  eventTitle,
  eventDate,
  gifts,
  winners,
  poolSize,
  poolNames,
  presentPeople,
}: {
  eventKey: string;
  eventTitle: string;
  eventDate: string;
  gifts: StageGift[];
  winners: StageWinner[];
  poolSize: number;
  /** Names only, for the rolling animation. The gift and the winner are always picked on the server. */
  poolNames: string[];
  /** Checked-in people who can be named as the winner instead of a random draw. */
  presentPeople: Array<{ participationId: string; name: string; kind: string }>;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [confirm, setConfirm] = useState<null | 'spin' | 'redraw'>(null);
  const [giftRoll, setGiftRoll] = useState('');
  const [nameRoll, setNameRoll] = useState('');
  const [result, setResult] = useState<SpinResult | null>(null);
  const [chosen, setChosen] = useState('');
  const [error, setError] = useState<string | null>(null);
  // While rolling the server data may already contain the result; keep showing the list from before.
  const [frozenWinners, setFrozenWinners] = useState<StageWinner[] | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const rolling = phase === 'rollingGift' || phase === 'rollingWinner';

  // Pick up new check-ins and changes made on the console. Paused while rolling.
  useEffect(() => {
    if (rolling) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [rolling, router]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // One entry per remaining unit, the same odds the server uses.
  const giftTickets = useMemo(() => gifts.flatMap((gift) => Array<string>(gift.remaining).fill(gift.name)), [gifts]);
  const remainingUnits = giftTickets.length;
  const totalUnits = gifts.reduce((sum, gift) => sum + gift.quantity, 0);
  const listed = frozenWinners ?? winners;
  const resultGift = result ? gifts.find((gift) => gift.id === result.giftId) ?? null : null;
  const chosenPerson = presentPeople.find((person) => person.participationId === chosen) ?? null;
  const canSpin = !rolling && remainingUnits > 0 && (chosenPerson !== null || poolSize > 0);

  async function spin() {
    if (!canSpin) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setConfirm(null);
    setError(null);
    setResult(null);
    setFrozenWinners(winners);
    setNameRoll('');
    setGiftRoll(reduced ? '' : giftTickets[0] ?? '');
    setPhase('rollingGift');

    const box: { value: StageDrawResult | null } = { value: null };
    const request = stageSpinGiftAction(eventKey, chosenPerson?.participationId ?? null)
      .catch((): StageDrawResult => ({ ok: false, message: '連線失敗，不確定有沒有抽出。請看右側得主名單確認後再操作。' }))
      .then((value) => {
        box.value = value;
        return value;
      });
    const status = () => (!aliveRef.current ? 'stop' : !box.value ? 'waiting' : box.value.ok ? 'ok' : 'stop');

    if (!reduced) await rollNames(shuffle(giftTickets), setGiftRoll, status);
    const outcome = await request;
    if (!aliveRef.current) return;
    if (!outcome.ok) {
      setFrozenWinners(null);
      setError(outcome.message);
      setPhase('idle');
      router.refresh();
      return;
    }

    setGiftRoll(outcome.giftName ?? '');
    if (!chosenPerson && !reduced) {
      // The gift is out; now roll the names for a moment before showing who gets it.
      setPhase('rollingWinner');
      await rollNames(shuffle(poolNames), setNameRoll, () => (aliveRef.current ? 'ok' : 'stop'));
      if (!aliveRef.current) return;
    }
    setFrozenWinners(null);
    setResult({
      awardId: outcome.awardId,
      giftId: outcome.giftId,
      giftName: outcome.giftName ?? '',
      name: outcome.winnerName,
      kind: outcome.winnerKind,
    });
    setPhase('revealed');
    setChosen('');
  }

  async function redraw() {
    if (!result || rolling) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previous = result;
    setConfirm(null);
    setError(null);
    setFrozenWinners(winners);
    setNameRoll('');
    setPhase('rollingWinner');

    const box: { value: StageDrawResult | null } = { value: null };
    const request = stageRedrawAction(eventKey, previous.awardId)
      .catch((): StageDrawResult => ({ ok: false, message: '連線失敗，不確定有沒有重抽。請看右側得主名單確認後再操作。' }))
      .then((value) => {
        box.value = value;
        return value;
      });
    if (!reduced) {
      await rollNames(shuffle(poolNames.filter((name) => name !== previous.name)), setNameRoll, () =>
        !aliveRef.current ? 'stop' : !box.value ? 'waiting' : box.value.ok ? 'ok' : 'stop',
      );
    }
    const outcome = await request;
    if (!aliveRef.current) return;
    setFrozenWinners(null);
    if (outcome.ok) {
      setResult({ ...previous, awardId: outcome.awardId, name: outcome.winnerName, kind: outcome.winnerKind });
    } else {
      setError(outcome.message);
      router.refresh();
    }
    setPhase('revealed');
  }

  function next() {
    setResult(null);
    setGiftRoll('');
    setNameRoll('');
    setConfirm(null);
    setError(null);
    setPhase('idle');
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  const giftText = phase === 'idle' ? '' : phase === 'rollingGift' ? giftRoll : result?.giftName || giftRoll;
  const nameText = phase === 'rollingWinner' ? nameRoll : phase === 'revealed' ? result?.name ?? '' : '';

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
        <section className="flex min-w-0 flex-col items-center justify-center gap-5 px-5 py-8 text-center" aria-label="抽獎舞台">
          {gifts.length === 0 ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xl font-bold">這場活動還沒有禮物</p>
              <p className="max-w-[44ch] text-sm text-tb-muted">請先到領導團隊中控的「禮物」頁新增禮物，這裡會自動出現。</p>
            </div>
          ) : (
            <>
              <p className="text-tb-muted" style={{ fontSize: 'clamp(15px, 1.8vw, 24px)' }}>
                還有 <span className="tb-num font-semibold text-tb-text">{remainingUnits}</span> / {totalUnits} 份禮物
                <span className="mx-3 text-tb-faint">|</span>
                抽獎池 <span className="tb-num font-semibold text-tb-text">{poolSize}</span> 人
              </p>

              <div
                className="flex min-h-[18vh] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-tb-line bg-tb-surf px-4 py-5"
                style={{ containerType: 'inline-size' }}
              >
                <p className="tb-eyebrow">{phase === 'rollingGift' ? '轉禮物中' : '禮物'}</p>
                {giftText ? (
                  <>
                    <p
                      className={cn('max-w-full break-words font-bold leading-tight', phase === 'rollingGift' ? 'text-tb-muted' : 'text-tb-gold')}
                      style={{ fontSize: 'clamp(26px, 6cqw, 84px)' }}
                      aria-hidden={phase === 'rollingGift'}
                    >
                      {giftText}
                    </p>
                    {phase !== 'rollingGift' && resultGift?.donor ? (
                      <p className="text-tb-muted" style={{ fontSize: 'clamp(14px, 2cqw, 24px)' }}>
                        {resultGift.donor} 提供
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-tb-faint" style={{ fontSize: 'clamp(18px, 3cqw, 36px)' }}>
                    {remainingUnits === 0 ? '所有禮物都抽完了' : '按「開抽」隨機轉出一份禮物'}
                  </p>
                )}
              </div>

              <div
                className="flex min-h-[24vh] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-tb-line bg-tb-surf px-4 py-5"
                style={{ containerType: 'inline-size' }}
              >
                <p className="tb-eyebrow">{phase === 'rollingWinner' ? '抽得主中' : '得主'}</p>
                {nameText ? (
                  <>
                    <p
                      className={cn(
                        'max-w-full break-words font-black leading-none transition-transform duration-500',
                        phase === 'rollingWinner' ? 'scale-90 text-tb-muted' : 'scale-100 text-tb-text',
                      )}
                      style={{ fontSize: stageNameSize(nameText) }}
                      aria-hidden={phase === 'rollingWinner'}
                    >
                      {nameText}
                    </p>
                    {phase === 'revealed' && result ? <span className={winnerKindChip(result.kind)}>{winnerKindLabel(result.kind)}</span> : null}
                  </>
                ) : (
                  <p className="text-tb-faint" style={{ fontSize: 'clamp(16px, 2.6cqw, 32px)' }}>
                    {chosenPerson ? `這次由 ${chosenPerson.name} 得到轉出的禮物` : poolSize === 0 ? '抽獎池還沒有人，請先完成簽到' : '禮物轉出後抽出得主'}
                  </p>
                )}
              </div>

              <p className="sr-only" role="status" aria-live="polite">
                {phase === 'revealed' && result ? `${result.giftName} 的得主是 ${result.name}` : ''}
              </p>

              <div className="flex w-full max-w-xl flex-col items-center gap-3">
                {phase === 'idle' ? (
                  <label className="tb-label w-full text-left" htmlFor="stage-winner">
                    得主
                    <select
                      id="stage-winner"
                      className="tb-select min-h-[44px]"
                      value={chosen}
                      onChange={(event) => {
                        setChosen(event.target.value);
                        setConfirm(null);
                      }}
                    >
                      <option value="">從抽獎池隨機抽出</option>
                      {presentPeople.map((person) => (
                        <option key={person.participationId} value={person.participationId}>
                          指定：{person.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {rolling ? (
                    <button type="button" className="tb-btn tb-btn-gold tb-btn-lg" disabled>
                      抽獎中…
                    </button>
                  ) : null}

                  {phase === 'idle' && confirm !== 'spin' ? (
                    <button type="button" className="tb-btn tb-btn-gold tb-btn-lg min-w-[160px]" disabled={!canSpin} onClick={() => setConfirm('spin')}>
                      開抽
                    </button>
                  ) : null}
                  {phase === 'idle' && confirm === 'spin' ? (
                    <>
                      <button type="button" className="tb-btn tb-btn-gold tb-btn-lg" onClick={() => void spin()}>
                        確定開抽
                      </button>
                      <button type="button" className="tb-btn tb-btn-quiet tb-btn-lg" onClick={() => setConfirm(null)}>
                        取消
                      </button>
                    </>
                  ) : null}

                  {phase === 'revealed' && result && confirm !== 'redraw' ? (
                    <button type="button" className="tb-btn tb-btn-outline tb-btn-lg" onClick={() => setConfirm('redraw')}>
                      重抽得主
                    </button>
                  ) : null}
                  {phase === 'revealed' && result && confirm === 'redraw' ? (
                    <>
                      <button type="button" className="tb-btn tb-btn-outline tb-btn-lg" onClick={() => void redraw()}>
                        確定重抽
                      </button>
                      <button type="button" className="tb-btn tb-btn-quiet tb-btn-lg" onClick={() => setConfirm(null)}>
                        取消
                      </button>
                    </>
                  ) : null}

                  {phase === 'revealed' && confirm === null ? (
                    <button type="button" className="tb-btn tb-btn-gold tb-btn-lg" onClick={next} disabled={remainingUnits === 0}>
                      下一份
                    </button>
                  ) : null}
                </div>

                {confirm === 'redraw' && result ? (
                  <p className="text-sm text-tb-muted">禮物不變，重新抽一位得主。{result.name} 的結果會留在紀錄裡。</p>
                ) : null}
                {error ? (
                  <p role="alert" className="tb-form-error">
                    {error}
                  </p>
                ) : null}
              </div>
            </>
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
