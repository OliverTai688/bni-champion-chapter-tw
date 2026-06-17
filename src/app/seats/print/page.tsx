'use client';

import { useEffect, useState } from 'react';
import { SeatData, SeatingWorkspaceState } from '@/types/seating';
import { buildPersonChainIndex } from '@/lib/industry-chains';

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
          {isSound ? '音控' : '值日'}
        </span>
      )}

      {/* Name */}
      <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
        {seat.name}
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

export default function PrintPage() {
  const [state, setState] = useState<SeatingWorkspaceState | null>(null);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const raw = sessionStorage.getItem('print-state') ?? localStorage.getItem('print-state');
      if (raw) setState(JSON.parse(raw));
    }, 0);
    const printTimer = window.setTimeout(() => window.print(), 700);
    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(printTimer);
    };
  }, []);

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
        {!state ? (
          <p style={{ color: '#6b7280', padding: 40 }}>
            讀取座位資料中…若未自動列印，請重新點擊「匯出 PDF」按鈕。
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
                    }}>
                      {role.name}
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
