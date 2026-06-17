// 115/05/21 BNI長冠軍分會座位表
// 林育群、郭子郁、梁文齡 本週代理人。
// 教育協調由黎士銓代理（列入 topRoles，移出 mainGrid）。
// 來賓 1 位：莊仕妤（執事：馬廷軒）。
// 值日生：王致崴；音控：戴宇星。

import { Roster, SeatingLayout } from '@/types/seating';

// ── 固定 Roster ──────────────────────────────────────────────────────────────

export const ROSTER_0521: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '黎士銓' },
  ],

  sound: '戴宇星',
  duty:  '王致崴',

  guests: [
    { number: '賓1', guestName: '莊仕妤', hostName: '馬廷軒' },
  ],

  // 一般成員（依 mainGrid 掃描順序，跳過 isGuest/isHost/isSound/isDuty/代理）
  members: [
    '林家均', '田謦蓉', '蘇子茵',              // [0][0-2]
    '邱孟婷', '陳志誠',                        // [1][1-2]
    '黃嘉琪', '黃佳琪',                        // [2][1,3]
    '蘇冠霖', '林塏秢', '吳振綱', '葉心琳',    // [3][0-3]
    '程睿紳', '陳俊鳴', '林道元', '王柏詠',    // [4][0-3]
    '陳泓睿', '陳宜均', '邱柏瀚', '王建豐',    // [5][0-3]
    '黃柔涵', '劉庭羽', '洪宗宏',              // [6][0-2]
    '叢晧日', '簡偉志',                        // [7][0-1]
  ],

  proxies: ['林育群', '郭子郁', '梁文齡'],

  industryChains: [],

  heroes: ['家均', '子茵', '宗宏', '宜均', '柏瀚', '睿紳', '柔涵', '子宜'],
};

// ── 固定 SeatingLayout ───────────────────────────────────────────────────────
//
// 第一排長桌              │  第二排長桌
// 欄0(前側)  欄1(後側)    │  欄2(前側)  欄3(後側)
// ──────────────────────────────────────────────────────────────────
// 列 0：林家均   田謦蓉    │ 蘇子茵     值日(致崴)
// 列 1：賓1(莊)  邱孟婷    │ 陳志誠     音控(宇星)
// 列 2：廷軒(執) 黃嘉琪    │ 梁文齡(代) 黃佳琪
// 列 3：蘇冠霖   林塏秢    │ 吳振綱     葉心琳
// 列 4：程睿紳   陳俊鳴    │ 林道元     王柏詠
// 列 5：陳泓睿   陳宜均    │ 邱柏瀚     王建豐
// 列 6：黃柔涵   劉庭羽    │ 洪宗宏     郭子郁(代)
// 列 7：叢晧日   簡偉志    │ 林育群(代) (空)

export const LAYOUT_0521: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '黎士銓', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：林家均 / 田謦蓉 / 蘇子茵 / 值日(王致崴)
    [
      { id: 'g-0-0', name: '林家均', isGuest: false },
      { id: 'g-0-1', name: '田謦蓉', isGuest: false },
      { id: 'g-0-2', name: '蘇子茵', isGuest: false },
      { id: 'g-0-3', name: '王致崴', isGuest: false, isDuty: true },
    ],
    // 列 1：賓1(莊仕妤) / 邱孟婷 / 陳志誠 / 音控(戴宇星)
    [
      { id: 'g-1-0', name: '莊仕妤', isGuest: true, guestNumber: '賓1' },
      { id: 'g-1-1', name: '邱孟婷', isGuest: false },
      { id: 'g-1-2', name: '陳志誠', isGuest: false },
      { id: 'g-1-3', name: '戴宇星', isGuest: false, isSound: true },
    ],
    // 列 2：廷軒(執·賓1) / 黃嘉琪 / 梁文齡(代理) / 黃佳琪
    [
      { id: 'g-2-0', name: '馬廷軒', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-2-1', name: '黃嘉琪', isGuest: false },
      { id: 'g-2-2', name: '梁文齡', isGuest: false, role: '代理' },
      { id: 'g-2-3', name: '黃佳琪', isGuest: false },
    ],
    // 列 3：蘇冠霖 / 林塏秢 / 吳振綱 / 葉心琳
    [
      { id: 'g-3-0', name: '蘇冠霖', isGuest: false },
      { id: 'g-3-1', name: '林塏秢', isGuest: false },
      { id: 'g-3-2', name: '吳振綱', isGuest: false },
      { id: 'g-3-3', name: '葉心琳', isGuest: false },
    ],
    // 列 4：程睿紳 / 陳俊鳴 / 林道元 / 王柏詠
    [
      { id: 'g-4-0', name: '程睿紳', isGuest: false },
      { id: 'g-4-1', name: '陳俊鳴', isGuest: false },
      { id: 'g-4-2', name: '林道元', isGuest: false },
      { id: 'g-4-3', name: '王柏詠', isGuest: false },
    ],
    // 列 5：陳泓睿 / 陳宜均 / 邱柏瀚 / 王建豐
    [
      { id: 'g-5-0', name: '陳泓睿', isGuest: false },
      { id: 'g-5-1', name: '陳宜均', isGuest: false },
      { id: 'g-5-2', name: '邱柏瀚', isGuest: false },
      { id: 'g-5-3', name: '王建豐', isGuest: false },
    ],
    // 列 6：黃柔涵 / 劉庭羽 / 洪宗宏 / 郭子郁(代理)
    [
      { id: 'g-6-0', name: '黃柔涵', isGuest: false },
      { id: 'g-6-1', name: '劉庭羽', isGuest: false },
      { id: 'g-6-2', name: '洪宗宏', isGuest: false },
      { id: 'g-6-3', name: '郭子郁', isGuest: false, role: '代理' },
    ],
    // 列 7：叢晧日 / 簡偉志 / 林育群(代理) / (空)
    [
      { id: 'g-7-0', name: '叢晧日', isGuest: false },
      { id: 'g-7-1', name: '簡偉志', isGuest: false },
      { id: 'g-7-2', name: '林育群', isGuest: false, role: '代理' },
      null,
    ],
  ],

  sidebar: [],
};
