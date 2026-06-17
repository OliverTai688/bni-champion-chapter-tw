// 115/04/30 BNI長冠軍分會座位表 — 固定版本
// 此檔案為當日完整名單的唯一事實來源，不應隨程式邏輯或 CSV 更動而改動。
// 如需修改，請建立新日期的同型檔案，而非覆蓋此檔。

import { Roster, SeatingLayout } from '@/types/seating';

// ── 固定 Roster（人員名單）──────────────────────────────────────────────────

export const ROSTER_0430: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '吳振綱',
  duty:  '郭子郁',

  // 9 位來賓與對應執事，依賓號排序
  guests: [
    { number: '賓1', guestName: '林子晏', hostName: '馬廷軒' },
    { number: '賓2', guestName: '黃大霖', hostName: '林家均' },
    { number: '賓3', guestName: 'Chimy',  hostName: '黎士銓' },
    { number: '賓4', guestName: '李采節', hostName: '蘇子茵' },
    { number: '賓5', guestName: '許貝妮', hostName: '邱孟婷' },
    { number: '賓6', guestName: '黃岱煒', hostName: '邱柏瀚' },
    { number: '賓7', guestName: '雷應潔', hostName: '叢晧日' },
    { number: '賓8', guestName: '戴禮淳', hostName: '蘇冠霖' },
    { number: '賓9', guestName: '凱薩琳', hostName: '田謦蓉' },
  ],

  // 一般成員（依座位表由上到下、由左到右順序）
  // 馬廷軒、叢晧日、邱柏瀚 改為執事；洪宗宏、王柏詠、王致崴 改為一般成員
  members: [
    '洪宗宏', '王柏詠', '王致崴', '王建豐',
    '陳宜均', '劉庭羽', '黃柔涵', '黃嘉琪',
    '陳泓睿', '簡偉志', '戴宇星', '陳志誠',
    '林道元', '陳俊鳴', '梁文齡', '黃佳琪',
  ],

  proxies: ['林塏秢', '程睿紳'],

  industryChains: [],

  heroes: ['孟婷', '子茵', '廷軒', '子宜', '嘉慧'],
};

// ── 固定 SeatingLayout（座位配置）──────────────────────────────────────────
//
// 格局設計原則：來賓正後方（同欄下一列）一定是對應執事。
//
// 列 0：賓1  │ 賓3  │ 賓5  │ 賓7
// 列 1：廷軒  │ 士銓  │ 孟婷  │ 叢導       ← 執·賓1/3/5/7
// 列 2：賓2  │ 賓4  │ 賓6  │ 賓8
// 列 3：家均  │ 子茵  │ jerry │ 小樹       ← 執·賓2/4/6/8
// 列 4：賓9  │ 音控  │ 值日生 │ 洪宗宏
// 列 5：謦蓉  │ 王柏詠 │ 王致崴 │ 王建豐    ← 執·賓9
// 列 6：陳宜均│ 劉庭羽│ 黃柔涵│ 黃嘉琪
// 列 7：陳泓睿│ 簡偉志│ 戴宇星│ 陳志誠
// 列 8：林道元│ 陳俊鳴│ 梁文齡│ 黃佳琪
// 列 9：(空) │ 林塏秢│ 程睿紳│ (空)       ← 代理

export const LAYOUT_0430: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓1 / 賓3 / 賓5 / 賓7
    [
      { id: 'g-0-0', name: '林子晏', isGuest: true,  guestNumber: '賓1' },
      { id: 'g-0-1', name: 'Chimy',  isGuest: true,  guestNumber: '賓3' },
      { id: 'g-0-2', name: '許貝妮', isGuest: true,  guestNumber: '賓5' },
      { id: 'g-0-3', name: '雷應潔', isGuest: true,  guestNumber: '賓7' },
    ],
    // 列 1：馬廷軒(執·賓1) / 黎士銓(執·賓3) / 邱孟婷(執·賓5) / 叢晧日(執·賓7)
    [
      { id: 'g-1-0', name: '馬廷軒', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '黎士銓', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-2', name: '邱孟婷', isGuest: false, isHost: true, hostFor: '賓5' },
      { id: 'g-1-3', name: '叢晧日', isGuest: false, isHost: true, hostFor: '賓7' },
    ],
    // 列 2：賓2 / 賓4 / 賓6 / 賓8
    [
      { id: 'g-2-0', name: '黃大霖', isGuest: true,  guestNumber: '賓2' },
      { id: 'g-2-1', name: '李采節', isGuest: true,  guestNumber: '賓4' },
      { id: 'g-2-2', name: '黃岱煒', isGuest: true,  guestNumber: '賓6' },
      { id: 'g-2-3', name: '戴禮淳', isGuest: true,  guestNumber: '賓8' },
    ],
    // 列 3：林家均(執·賓2) / 蘇子茵(執·賓4) / 邱柏瀚(執·賓6) / 蘇冠霖(執·賓8)
    [
      { id: 'g-3-0', name: '林家均', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-3-1', name: '蘇子茵', isGuest: false, isHost: true, hostFor: '賓4' },
      { id: 'g-3-2', name: '邱柏瀚', isGuest: false, isHost: true, hostFor: '賓6' },
      { id: 'g-3-3', name: '蘇冠霖', isGuest: false, isHost: true, hostFor: '賓8' },
    ],
    // 列 4：賓9 / 吳振綱(音控) / 郭子郁(值日生) / 洪宗宏
    [
      { id: 'g-4-0', name: '凱薩琳', isGuest: true,  guestNumber: '賓9' },
      { id: 'g-4-1', name: '吳振綱', isGuest: false, isSound: true },
      { id: 'g-4-2', name: '郭子郁', isGuest: false, isDuty: true },
      { id: 'g-4-3', name: '洪宗宏', isGuest: false },
    ],
    // 列 5：田謦蓉(執·賓9) / 王柏詠 / 王致崴 / 王建豐
    [
      { id: 'g-5-0', name: '田謦蓉', isGuest: false, isHost: true, hostFor: '賓9' },
      { id: 'g-5-1', name: '王柏詠', isGuest: false },
      { id: 'g-5-2', name: '王致崴', isGuest: false },
      { id: 'g-5-3', name: '王建豐', isGuest: false },
    ],
    // 列 6：陳宜均 / 劉庭羽 / 黃柔涵 / 黃嘉琪
    [
      { id: 'g-6-0', name: '陳宜均', isGuest: false },
      { id: 'g-6-1', name: '劉庭羽', isGuest: false },
      { id: 'g-6-2', name: '黃柔涵', isGuest: false },
      { id: 'g-6-3', name: '黃嘉琪', isGuest: false },
    ],
    // 列 7：陳泓睿 / 簡偉志 / 戴宇星 / 陳志誠
    [
      { id: 'g-7-0', name: '陳泓睿', isGuest: false },
      { id: 'g-7-1', name: '簡偉志', isGuest: false },
      { id: 'g-7-2', name: '戴宇星', isGuest: false },
      { id: 'g-7-3', name: '陳志誠', isGuest: false },
    ],
    // 列 8：林道元 / 陳俊鳴 / 梁文齡 / 黃佳琪
    [
      { id: 'g-8-0', name: '林道元', isGuest: false },
      { id: 'g-8-1', name: '陳俊鳴', isGuest: false },
      { id: 'g-8-2', name: '梁文齡', isGuest: false },
      { id: 'g-8-3', name: '黃佳琪', isGuest: false },
    ],
    // 列 9：(空) / 林塏秢(代理) / 程睿紳(代理) / (空)
    [
      null,
      { id: 'g-9-1', name: '林塏秢', isGuest: false, role: '代理' },
      { id: 'g-9-2', name: '程睿紳', isGuest: false, role: '代理' },
      null,
    ],
  ],

  sidebar: [],
};
