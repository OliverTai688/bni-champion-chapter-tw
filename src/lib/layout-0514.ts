// 115/05/14 BNI長冠軍分會座位表 — 固定版本
// 6 位來賓。賓1(康永忠) 特殊安排：
//   泓睿在其正前方（欄0，同側上一列）；致崴在其對面（欄1，同列跨桌1）。
// 值日生：郭子郁；音控：戴宇星。代理人：叢晧日（僅1位）。
// 此檔案為當日完整名單的唯一事實來源，不應隨程式邏輯或 CSV 更動而改動。

import { Roster, SeatingLayout } from '@/types/seating';

// ── 固定 Roster ──────────────────────────────────────────────────────────────

export const ROSTER_0514: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '戴宇星',
  duty:  '郭子郁',

  guests: [
    { number: '賓1', guestName: '康永忠', hostName: '馬廷軒' },
    { number: '賓2', guestName: '王智德', hostName: '蘇冠霖' },
    { number: '賓3', guestName: '黃岱煒', hostName: '邱柏瀚' },
    { number: '賓4', guestName: '陳勁華', hostName: '黎士銓' },
    { number: '賓5', guestName: '黃立民', hostName: '邱孟婷' },
    { number: '賓6', guestName: '詹儒鎧', hostName: '林家均' },
  ],

  // 一般成員（依 mainGrid 掃描順序，跳過 isGuest/isHost/isSound/isDuty/代理）
  members: [
    '陳泓睿',   // [0][0] 賓1 正前方（欄0，上一列）
    '田謦蓉',   // [0][2]
    '王致崴',   // [1][1] 賓1 對面（欄1，同列，跨第一排長桌）
    '蘇子茵',   // [2][1]
    '洪宗宏',   // [3][3]
    '王柏詠',   // [4][3]
    '王建豐', '陳宜均', '黃柔涵', '黃嘉琪',
    '簡偉志', '陳志誠', '陳俊鳴', '梁文齡',
    '黃佳琪', '吳振綱', '葉心琳', '林道元',
    '劉庭羽',   // [8][0]
  ],

  proxies: ['叢晧日'],

  industryChains: [],

  heroes: ['子茵', '廷軒', '家均', '冠霖', '宗宏', '子宜'],
};

// ── 固定 SeatingLayout ───────────────────────────────────────────────────────
//
// 物理場地：欄0+1 = 第一排長桌（面對面），欄2+3 = 第二排長桌（面對面）
//
// 第一排長桌              │  第二排長桌
// 欄0(前側)  欄1(後側)    │  欄2(前側)  欄3(後側)
// ──────────────────────────────────────────────────
// 列 0：泓睿     音控(宇星) │ 田謦蓉     值日(子郁)
// 列 1：賓1(康)  致崴      │ 賓2(王)    賓3(黃岱煒)
// 列 2：廷軒     蘇子茵    │ 冠霖       柏瀚
// 列 3：賓4(陳)  賓5(黃立) │ 賓6(詹)    洪宗宏
// 列 4：士銓     孟婷      │ 家均       王柏詠
// 列 5：王建豐   陳宜均    │ 黃柔涵     黃嘉琪
// 列 6：簡偉志   陳志誠    │ 陳俊鳴     梁文齡
// 列 7：黃佳琪   吳振綱    │ 葉心琳     林道元
// 列 8：劉庭羽   (空)      │ 叢晧日(代) (空)

export const LAYOUT_0514: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：泓睿(賓1前方) / 音控(戴宇星) / 田謦蓉 / 值日(郭子郁)
    [
      { id: 'g-0-0', name: '陳泓睿', isGuest: false },
      { id: 'g-0-1', name: '戴宇星', isGuest: false, isSound: true },
      { id: 'g-0-2', name: '田謦蓉', isGuest: false },
      { id: 'g-0-3', name: '郭子郁', isGuest: false, isDuty: true },
    ],
    // 列 1：賓1 / 致崴(賓1對面，欄1) / 賓2 / 賓3
    [
      { id: 'g-1-0', name: '康永忠', isGuest: true,  guestNumber: '賓1' },
      { id: 'g-1-1', name: '王致崴', isGuest: false },
      { id: 'g-1-2', name: '王智德', isGuest: true,  guestNumber: '賓2' },
      { id: 'g-1-3', name: '黃岱煒', isGuest: true,  guestNumber: '賓3' },
    ],
    // 列 2：廷軒(執·賓1) / 蘇子茵 / 冠霖(執·賓2) / 柏瀚(執·賓3)
    [
      { id: 'g-2-0', name: '馬廷軒', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-2-1', name: '蘇子茵', isGuest: false },
      { id: 'g-2-2', name: '蘇冠霖', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-2-3', name: '邱柏瀚', isGuest: false, isHost: true, hostFor: '賓3' },
    ],
    // 列 3：賓4 / 賓5 / 賓6 / 洪宗宏
    [
      { id: 'g-3-0', name: '陳勁華', isGuest: true,  guestNumber: '賓4' },
      { id: 'g-3-1', name: '黃立民', isGuest: true,  guestNumber: '賓5' },
      { id: 'g-3-2', name: '詹儒鎧', isGuest: true,  guestNumber: '賓6' },
      { id: 'g-3-3', name: '洪宗宏', isGuest: false },
    ],
    // 列 4：士銓(執·賓4) / 孟婷(執·賓5) / 家均(執·賓6) / 王柏詠
    [
      { id: 'g-4-0', name: '黎士銓', isGuest: false, isHost: true, hostFor: '賓4' },
      { id: 'g-4-1', name: '邱孟婷', isGuest: false, isHost: true, hostFor: '賓5' },
      { id: 'g-4-2', name: '林家均', isGuest: false, isHost: true, hostFor: '賓6' },
      { id: 'g-4-3', name: '王柏詠', isGuest: false },
    ],
    // 列 5：王建豐 / 陳宜均 / 黃柔涵 / 黃嘉琪
    [
      { id: 'g-5-0', name: '王建豐', isGuest: false },
      { id: 'g-5-1', name: '陳宜均', isGuest: false },
      { id: 'g-5-2', name: '黃柔涵', isGuest: false },
      { id: 'g-5-3', name: '黃嘉琪', isGuest: false },
    ],
    // 列 6：簡偉志 / 陳志誠 / 陳俊鳴 / 梁文齡
    [
      { id: 'g-6-0', name: '簡偉志', isGuest: false },
      { id: 'g-6-1', name: '陳志誠', isGuest: false },
      { id: 'g-6-2', name: '陳俊鳴', isGuest: false },
      { id: 'g-6-3', name: '梁文齡', isGuest: false },
    ],
    // 列 7：黃佳琪 / 吳振綱 / 葉心琳 / 林道元
    [
      { id: 'g-7-0', name: '黃佳琪', isGuest: false },
      { id: 'g-7-1', name: '吳振綱', isGuest: false },
      { id: 'g-7-2', name: '葉心琳', isGuest: false },
      { id: 'g-7-3', name: '林道元', isGuest: false },
    ],
    // 列 8：劉庭羽 / (空) / 叢晧日(代理) / (空)
    [
      { id: 'g-8-0', name: '劉庭羽', isGuest: false },
      null,
      { id: 'g-8-2', name: '叢晧日', isGuest: false, role: '代理' },
      null,
    ],
  ],

  sidebar: [],
};
