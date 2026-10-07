'use client';

import { useEffect } from 'react';
import { SeatData, SeatingWorkspaceState } from '@/types/seating';
import { buildPersonChainIndex } from '@/lib/industry-chains';
import { CHAPTER_MEMBER_DIRECTORY } from '@/lib/chapter-members';
import type { AdminSeatingWorkspaceDTO } from '@/application/seating/dto';

const CHAIN_COLORS: Record<string, { bg: string; color: string }> = {
  A: { bg: '#ef4444', color: '#fff' },
  B: { bg: '#f59e0b', color: '#fff' },
  C: { bg: '#10b981', color: '#fff' },
  D: { bg: '#0ea5e9', color: '#fff' },
};

const TOP_ROLE_COLORS = [
  { bg: '#dcfce7', border: '#4ade80', text: '#166534' },
  { bg: '#fef9c3', border: '#facc15', text: '#854d0e' },
  { bg: '#e0f2fe', border: '#38bdf8', text: '#0c4a6e' },
  { bg: '#ffe4e6', border: '#fb7185', text: '#9f1239' },
  { bg: '#ffedd5', border: '#fb923c', text: '#7c2d12' },
];

function SeatCard({ seat, chainIds }: { seat: SeatData | null; chainIds?: string[] }) {
  if (!seat) {
    return (
      <div style={{
        border: '1.5px dashed #d1d5db',
        borderRadius: 10,
        minHeight: 56,
        opacity: 0.3,
      }} />
    );
  }

  const isGuest = seat.isGuest;
  const isHost = seat.isHost;
  const isProxy = seat.role === '代理';
  const isSound = seat.isSound;
  const isDuty = seat.isDuty;
  const isCheckedIn = seat.attendanceStatus === 'checked_in';

  let cardStyle: React.CSSProperties = { background: '#fff', border: '1.5px solid #d1d5db' };
  if (isGuest)       cardStyle = { background: '#eef2ff', border: '2px solid #818cf8' };
  else if (isHost)   cardStyle = { background: '#fffbeb', border: '2px solid #fbbf24' };
  else if (isProxy)  cardStyle = { background: '#f3f4f6', border: '1.5px solid #9ca3af' };
  else if (isSound)  cardStyle = { background: '#f0f9ff', border: '1.5px solid #38bdf8' };
  else if (isDuty)   cardStyle = { background: '#f0fdf4', border: '1.5px solid #4ade80' };

  return (
    <div style={{
      position: 'relative',
      ...cardStyle,
      borderRadius: 10,
      minHeight: 58,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 8px 6px',
    }}>
      {/* Top-right badge: 賓X / 執·賓X / 代理 */}
      {isGuest && (
        <span style={{
          position: 'absolute', top: -10, right: -10,
          background: '#6366f1', color: '#fff',
          fontSize: 11, fontWeight: 900,
          padding: '2px 8px', borderRadius: 99,
          lineHeight: 1.5, letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}>
          {seat.guestNumber}
        </span>
      )}
      {isHost && (
        <span style={{
          position: 'absolute', top: -10, right: -10,
          background: '#f59e0b', color: '#fff',
          fontSize: 11, fontWeight: 900,
          padding: '2px 8px', borderRadius: 99,
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
        }}>
          執{seat.hostFor ? `·${seat.hostFor}` : ''}
        </span>
      )}
      {isProxy && (
        <span style={{
          position: 'absolute', top: -10, right: -10,
          background: '#6b7280', color: '#fff',
          fontSize: 11, fontWeight: 900,
          padding: '2px 8px', borderRadius: 99,
          lineHeight: 1.5,
        }}>
          代理
        </span>
      )}
      {/* Top-left badge: 音控 / 值日 */}
      {(isSound || isDuty) && (
        <span style={{
          position: 'absolute', top: -10, left: -10,
          background: isSound ? '#0ea5e9' : '#22c55e', color: '#fff',
          fontSize: 11, fontWeight: 900,
          padding: '2px 8px', borderRadius: 99,
          lineHeight: 1.5,
        }}>
          {isSound && isDuty ? '值日・音控' : isSound ? '音控' : '值日'}
        </span>
      )}

      {/* Name */}
      <span style={{
        fontSize: 15,
        fontWeight: 700,
        color: '#0f172a',
        lineHeight: 1.3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
      }}>
        {isCheckedIn && (
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{ width: 14, height: 14, color: '#10b981', flexShrink: 0 }}
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span>{seat.name}</span>
      </span>

      {/* Industry chain tags */}
      {chainIds && chainIds.length > 0 && (
        <div style={{
          display: 'flex', gap: 3, flexWrap: 'wrap',
          justifyContent: 'center', marginTop: 5,
        }}>
          {chainIds.map((cid) => {
            const c = CHAIN_COLORS[cid[0]] ?? { bg: '#6b7280', color: '#fff' };
            return (
              <span key={cid} style={{
                background: c.bg, color: c.color,
                fontSize: 10, fontWeight: 900,
                padding: '1px 5px', borderRadius: 3,
                lineHeight: 1.5,
              }}>
                {cid}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12, flexShrink: 0 }}>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 12, height: 12, flexShrink: 0 }}>
      <circle cx="10" cy="10" r="7.2" />
    </svg>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{
      borderRadius: 10,
      padding: '10px 12px',
      background: accent ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.03)',
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent ? '#059669' : '#0f172a' }}>{value}</div>
      <div style={{ marginTop: 2, fontSize: 11, fontWeight: 700, color: '#6b7280' }}>{label}</div>
    </div>
  );
}

function AttendanceSeatTile({ seat }: { seat: AdminSeatingWorkspaceDTO['seats'][number] }) {
  const occupied = Boolean(seat.assignment);
  const checkedIn = seat.assignment?.status === 'checked_in';
  const positionLabel = seat.zone === 'top' ? 'TOP' : seat.seatKey.replace('main-', '');

  const cardStyle: React.CSSProperties = checkedIn
    ? { border: '1.5px solid #34d399', background: 'rgba(16,185,129,0.08)' }
    : occupied
      ? { border: '1.5px solid #d1d5db', background: '#fff' }
      : { border: '1.5px dashed #d1d5db', background: 'rgba(0,0,0,0.02)' };

  return (
    <div style={{ ...cardStyle, borderRadius: 10, minHeight: 76, padding: '10px 10px 8px', opacity: occupied ? 1 : 0.5 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 10, fontWeight: 900, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        <span>{positionLabel}</span>
        {occupied ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: checkedIn ? '#059669' : '#9ca3af' }}>
            {checkedIn ? <CheckIcon /> : <CircleIcon />}
            {checkedIn ? '已抵達' : '未到'}
          </span>
        ) : null}
      </div>
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
        {seat.assignment?.displayName ?? '空位'}
      </div>
      {occupied ? (
        <div style={{ marginTop: 2, fontSize: 11, color: '#6b7280' }}>
          {seat.assignment?.role ?? seat.kind}
        </div>
      ) : null}
    </div>
  );
}

function NameListCard({ title, names, emptyLabel }: { title: string; names: string[]; emptyLabel: string }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        fontSize: 11, fontWeight: 900, color: '#6b7280', marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        <span>{title}</span>
        <span style={{ fontSize: 13, color: '#0f172a' }}>{names.length}</span>
      </div>
      {names.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {names.map((name) => (
            <span key={name} style={{
              background: 'rgba(0,0,0,0.04)', borderRadius: 8,
              padding: '3px 9px', fontSize: 12, fontWeight: 700, color: '#374151',
            }}>
              {name}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: '#9ca3af' }}>{emptyLabel}</p>
      )}
    </div>
  );
}

function AttendanceReport({ dto }: { dto: AdminSeatingWorkspaceDTO }) {
  const topSeats = dto.seats.filter((s) => s.zone === 'top').sort((a, b) => a.position - b.position);
  const mainSeats = dto.seats.filter((s) => s.zone !== 'top').sort((a, b) => a.position - b.position);
  const mainCols = mainSeats.filter((s) => s.col !== null).map((s) => s.col ?? 0);
  const mainColumns = Math.max(4, ...mainCols.map((c) => c + 1));

  const proxyNames = dto.seats
    .filter((s) => s.assignment && (s.kind === 'proxy' || s.assignment.role === '代理'))
    .map((s) => s.assignment!.displayName);

  const presentNameSet = new Set(
    dto.seats
      .filter((s) => s.assignment)
      .map((s) => s.assignment!.displayName.trim())
      .filter(Boolean),
  );
  const absentNames = CHAPTER_MEMBER_DIRECTORY
    .filter((member) => !presentNameSet.has(member.name.trim()))
    .map((member) => member.name);

  const checkedInRate = dto.summary.occupiedSeats > 0
    ? Math.round((dto.summary.checkedInCount / dto.summary.occupiedSeats) * 100)
    : 0;

  const zoneStats = dto.zones.map((zone) => ({
    zone: zone.zone,
    occupiedSeats: zone.occupiedSeats,
    checkedInCount: dto.seats.filter((s) => s.zone === zone.zone && s.assignment?.status === 'checked_in').length,
  }));

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: '#9ca3af', textTransform: 'uppercase' }}>
        {dto.date} · {dto.meetingLabel}
      </div>
      <h1 style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: '#0f172a' }}>
        {dto.title} 出席報表
      </h1>
      <p style={{ marginTop: 4, marginBottom: 16, fontSize: 12, color: '#6b7280' }}>
        {dto.chapterName} · 列印時間 {new Date().toLocaleString('zh-TW')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
        <SummaryStat label="總座位" value={dto.summary.totalSeats} />
        <SummaryStat label="已安排" value={dto.summary.occupiedSeats} />
        <SummaryStat label="已抵達" value={dto.summary.checkedInCount} accent />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>
          <span>整體報到率</span>
          <span>{checkedInRate}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${checkedInRate}%`, borderRadius: 99, background: '#10b981' }} />
        </div>
      </div>

      {zoneStats.length > 0 && (
        <div style={{ marginBottom: 18, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            區域狀態
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {zoneStats.map((zone) => (
              <div key={zone.zone}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 3 }}>
                  <span>{zone.zone}</span>
                  <span>{zone.checkedInCount}/{zone.occupiedSeats} 已抵達</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${zone.occupiedSeats > 0 ? Math.min(100, (zone.checkedInCount / zone.occupiedSeats) * 100) : 0}%`,
                    borderRadius: 99,
                    background: '#10b981',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <NameListCard title="本次代理人" names={proxyNames} emptyLabel="本次無代理人" />
        <NameListCard title="本次未出席" names={absentNames} emptyLabel="本次全員出席" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10, fontSize: 11, fontWeight: 700, color: '#6b7280' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px solid #34d399', background: 'rgba(16,185,129,0.15)' }} />
          已抵達
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px solid #d1d5db', background: '#fff' }} />
          已安排
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px dashed #d1d5db', background: 'rgba(0,0,0,0.02)' }} />
          空位
        </span>
      </div>

      {topSeats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${topSeats.length}, 1fr)`, gap: 8, marginBottom: 12 }}>
          {topSeats.map((seat) => <AttendanceSeatTile key={seat.id} seat={seat} />)}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mainColumns}, 1fr)`, gap: 8 }}>
        {mainSeats.map((seat) => <AttendanceSeatTile key={seat.id} seat={seat} />)}
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: 10 }}>
        <span>智慧排位系統 v1.0</span>
        <span>列印日期：{new Date().toLocaleDateString('zh-TW')}</span>
      </div>
    </>
  );
}

/**
 * Print layout for one event, rendered from saved data passed in by the server
 * route, so the printed date always matches the event in the URL.
 */
export function SeatingPrintView({
  state,
  attendance,
  autoPrint = true,
}: {
  state?: SeatingWorkspaceState | null;
  attendance?: AdminSeatingWorkspaceDTO | null;
  autoPrint?: boolean;
}) {
  const rawDto = attendance ?? null;

  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(() => window.print(), 700);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  const personChainIndex = state
    ? buildPersonChainIndex(state.industryChains)
    : new Map<string, string[]>();

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 1cm; }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', 'Heiti TC', system-ui, sans-serif;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media screen {
          body { padding: 24px; background: #f3f4f6; }
          .print-root {
            background: #fff;
            max-width: 720px;
            margin: 0 auto;
            padding: 28px;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          }
        }
        @media print {
          body { background: #fff !important; padding: 0; }
          .print-root { padding: 0; }
        }
      `}</style>

      <div className="print-root">
        {rawDto ? (
          <AttendanceReport dto={rawDto} />
        ) : !state ? (
          <p style={{ color: '#6b7280', padding: 40 }}>
            這場活動還沒有座位表。
          </p>
        ) : (
          <>
            <h1 style={{
              fontSize: 20, fontWeight: 900, color: '#0f172a',
              letterSpacing: '0.06em', marginBottom: 14,
            }}>
              {state.week?.title || '未命名週次'} {state.week?.chapterName || ''}
            </h1> 

            {/* Hero Board */}
            {state.heroes.length > 0 && (
              <div style={{
                border: '2px solid #f59e0b', background: '#fefce8',
                borderRadius: 14, padding: '10px 14px', marginBottom: 14,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 900, color: '#92400e',
                  letterSpacing: '0.18em', marginBottom: 8,
                }}>
                  🏆 本週英雄榜
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {state.heroes.map((name, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#92400e' }}>
                        英{i + 1}
                      </span>
                      <span style={{
                        background: '#f59e0b', color: '#fff',
                        padding: '4px 14px', borderRadius: 10,
                        fontSize: 14, fontWeight: 900,
                      }}>
                        {name}
                      </span>
                      {i < state.heroes.length - 1 && (
                        <span style={{ color: '#f59e0b', fontSize: 16, fontWeight: 700 }}>›</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top Roles */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8, marginBottom: 18,
            }}>
              {state.topRoles.map((role, idx) => {
                const c = TOP_ROLE_COLORS[idx % TOP_ROLE_COLORS.length];
                return (
                  <div key={role.id} style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: '#6b7280',
                      marginBottom: 5, letterSpacing: '0.12em',
                    }}>
                      {role.role}
                    </div>
                    <div style={{
                      background: c.bg, border: `2px solid ${c.border}`,
                      borderRadius: 10, padding: '8px 4px',
                      fontSize: 15, fontWeight: 700, color: c.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}>
                      {role.attendanceStatus === 'checked_in' && (
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          style={{ width: 14, height: 14, color: '#10b981', flexShrink: 0 }}
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <span>{role.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main Seat Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              background: 'rgba(0,0,0,0.02)',
              border: '1px solid #e5e7eb',
              borderRadius: 20,
              padding: 18,
            }}>
              {state.items.map((seat, i) => (
                <SeatCard
                  key={i}
                  seat={seat}
                  chainIds={seat ? personChainIndex.get(seat.name.trim()) : undefined}
                />
              ))}
            </div>

            {/* Footer */}
            <div style={{
              marginTop: 12,
              display: 'flex', justifyContent: 'space-between',
              color: '#9ca3af', fontSize: 10,
            }}>
              <span>智慧排位系統 v1.0</span>
              <span>列印日期：{new Date().toLocaleDateString('zh-TW')}</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
