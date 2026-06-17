// 115/05/06 BNI長冠軍分會座位表 — 固定版本
// 本週無來賓、無英雄榜。代理人：叢晧日、劉庭羽。
// 值日生：吳振綱；音控：林道元。
// A/B/C/D 各組成員依序排列，同組盡量相鄰。
// 此檔案為當日完整名單的唯一事實來源，不應隨程式邏輯或 CSV 更動而改動。
// 如需修改，請建立新日期的同型檔案，而非覆蓋此檔。

import { Roster, SeatingLayout } from '@/types/seating';

// ── 固定 Roster（人員名單）──────────────────────────────────────────────────

export const ROSTER_0506: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '林道元',
  duty:  '吳振綱',

  guests: [],

  // 一般成員（依 A/B/C/D 分組排列；順序與下方 mainGrid 一致）
  members: [
    // A 組
    '林家均', '陳宜均',
    '黃柔涵',
    // B 組
    '邱柏瀚', '黎士銓', '王柏詠',
    '郭子郁', '田謦蓉', '洪宗宏', '王建豐',
    '王致崴', '馬廷軒',
    // C 組
    '蘇子茵', '戴宇星',
    '陳志誠', '陳俊鳴', '梁文齡', '黃佳琪',
    // D 組
    '陳泓睿', '邱孟婷', '蘇冠霖', '黃嘉琪',
    // D 組 (續) / 未分組
    '簡偉志', '葉心琳',
  ],

  proxies: ['叢晧日', '劉庭羽'],

  industryChains: [],

  heroes: [],
};

// ── 固定 SeatingLayout（座位配置）──────────────────────────────────────────
//
// 本週無來賓，格局依 A/B/C/D 產業服務鍊分組排列。
//
// 列 0：值日生(吳振綱)  │ 音控(林道元) │ 林家均(A)    │ 陳宜均(A)
// 列 1：黃柔涵(A)       │ 邱柏瀚(B)   │ 黎士銓(B)    │ 王柏詠(B)
// 列 2：郭子郁(B)       │ 田謦蓉(B)   │ 洪宗宏(B)    │ 王建豐(B)
// 列 3：王致崴(B)       │ 馬廷軒(B)   │ 蘇子茵(C)    │ 戴宇星(C)
// 列 4：陳志誠(C)       │ 陳俊鳴(C)   │ 梁文齡(C)    │ 黃佳琪(C)
// 列 5：陳泓睿(D)       │ 邱孟婷(D)   │ 蘇冠霖(D)    │ 黃嘉琪(D)
// 列 6：簡偉志          │ 葉心琳(C)   │ (空)         │ (空)
// 列 7：(空)            │ 叢晧日(代理) │ 劉庭羽(代理) │ (空)

export const LAYOUT_0506: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：值日生 / 音控 / 林家均(A) / 陳宜均(A)
    [
      { id: 'g-0-0', name: '吳振綱', isGuest: false, isDuty: true },
      { id: 'g-0-1', name: '林道元', isGuest: false, isSound: true },
      { id: 'g-0-2', name: '林家均', isGuest: false },
      { id: 'g-0-3', name: '陳宜均', isGuest: false },
    ],
    // 列 1：黃柔涵(A) / 邱柏瀚(B) / 黎士銓(B) / 王柏詠(B)
    [
      { id: 'g-1-0', name: '黃柔涵', isGuest: false },
      { id: 'g-1-1', name: '邱柏瀚', isGuest: false },
      { id: 'g-1-2', name: '黎士銓', isGuest: false },
      { id: 'g-1-3', name: '王柏詠', isGuest: false },
    ],
    // 列 2：郭子郁(B) / 田謦蓉(B) / 洪宗宏(B) / 王建豐(B)
    [
      { id: 'g-2-0', name: '郭子郁', isGuest: false },
      { id: 'g-2-1', name: '田謦蓉', isGuest: false },
      { id: 'g-2-2', name: '洪宗宏', isGuest: false },
      { id: 'g-2-3', name: '王建豐', isGuest: false },
    ],
    // 列 3：王致崴(B) / 馬廷軒(B) / 蘇子茵(C) / 戴宇星(C)
    [
      { id: 'g-3-0', name: '王致崴', isGuest: false },
      { id: 'g-3-1', name: '馬廷軒', isGuest: false },
      { id: 'g-3-2', name: '蘇子茵', isGuest: false },
      { id: 'g-3-3', name: '戴宇星', isGuest: false },
    ],
    // 列 4：陳志誠(C) / 陳俊鳴(C) / 梁文齡(C) / 黃佳琪(C)
    [
      { id: 'g-4-0', name: '陳志誠', isGuest: false },
      { id: 'g-4-1', name: '陳俊鳴', isGuest: false },
      { id: 'g-4-2', name: '梁文齡', isGuest: false },
      { id: 'g-4-3', name: '黃佳琪', isGuest: false },
    ],
    // 列 5：陳泓睿(D) / 邱孟婷(D) / 蘇冠霖(D) / 黃嘉琪(D)
    [
      { id: 'g-5-0', name: '陳泓睿', isGuest: false },
      { id: 'g-5-1', name: '邱孟婷', isGuest: false },
      { id: 'g-5-2', name: '蘇冠霖', isGuest: false },
      { id: 'g-5-3', name: '黃嘉琪', isGuest: false },
    ],
    // 列 6：簡偉志 / 葉心琳 / (空) / (空)
    [
      { id: 'g-6-0', name: '簡偉志', isGuest: false },
      { id: 'g-6-1', name: '葉心琳', isGuest: false },
      null,
      null,
    ],
    // 列 7：(空) / 叢晧日(代理) / 劉庭羽(代理) / (空)
    [
      null,
      { id: 'g-7-1', name: '叢晧日', isGuest: false, role: '代理' },
      { id: 'g-7-2', name: '劉庭羽', isGuest: false, role: '代理' },
      null,
    ],
  ],

  sidebar: [],
};
