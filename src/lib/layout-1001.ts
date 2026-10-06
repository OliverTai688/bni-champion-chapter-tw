// 115/10/01 BNI長冠軍分會座位表
// 新一屆領導團隊：主席 古又帆、副主席 黃子宜、秘書 田謦蓉、活動 陳泓睿、教育 程睿紳
// （卸任：活動 張媁淇、財務秘書 戴嘉慧、教育 林育群，回到會員座位）
// 值日生：郭子郁  音控：林道元
// 來賓 3 位（格局：來賓正後方為對應執事）
// 代理人：林育群、黃嘉琪
// 新人（格局同來賓/執事，新人正後方為導師）：陳平 / 導師 蘇冠霖（坐冠霖正後方）、陳軾 / 導師 王柏詠
// 劉庭羽已離開分會
// 英雄榜：暫無
//
// 座位以 09/30 22:24 頁面儲存版本（browser-draft v4，代理人移至後排）為底，再加入新人、移除庭羽

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_1001: Roster = {
  hostTeam: [
    { role: '活動協調', name: '陳泓睿' },
    { role: '財務秘書', name: '田謦蓉' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '程睿紳' },
  ],

  sound: '林道元',
  duty:  '郭子郁',

  guests: [
    { number: '賓1', guestName: '葉子豪', hostName: '蘇冠霖' },
    { number: '賓2', guestName: '吳岳樵', hostName: '邱孟婷' },
    { number: '賓3', guestName: '黃傑',   hostName: '黎士銓' },
  ],

  members: [
    '陳平', '陳軾', '蘇子茵', '陳宜均',
    '叢晧日', '王柏詠', '戴嘉慧', '葉心琳',
    '林子晏', '戴宇星', '洪宗宏', '陳俊鳴',
    '黃杰', '韓政諺', '洪麗卿', '黃佳琪',
    '王建豐', '吳振綱', '王致崴', '梁文齡',
    '馬廷軒', '黃柔涵', '邱柏瀚', '林家均',
    '林塏秢', '陳志誠',
    '張媁淇',
  ],

  proxies: ['林育群', '黃嘉琪'],

  industryChains: [],

  heroes: [],
};

export const LAYOUT_1001: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '陳泓睿', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '田謦蓉', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '程睿紳', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓1 / 賓2 / 賓3 / 郭子郁(值日生)
    [
      { id: 'g-0-0', name: '葉子豪', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '吳岳樵', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '黃傑',   isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-3', name: '郭子郁', isGuest: false, isDuty: true },
    ],
    // 列 1：蘇冠霖(執·賓1) / 邱孟婷(執·賓2) / 黎士銓(執·賓3) / 林道元(音控)
    [
      { id: 'g-1-0', name: '蘇冠霖', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '邱孟婷', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '黎士銓', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-3', name: '林道元', isGuest: false, isSound: true },
    ],
    // 列 2：陳平(新·導冠霖) / 陳軾(新·導柏詠) / 蘇子茵 / 陳宜均
    [
      { id: 'g-2-0', name: '陳平', isGuest: false },
      { id: 'g-2-1', name: '陳軾', isGuest: false },
      { id: 'g-2-2', name: '蘇子茵', isGuest: false },
      { id: 'g-2-3', name: '陳宜均', isGuest: false },
    ],
    // 列 3：叢晧日 / 王柏詠(導·陳軾) / 戴嘉慧 / 葉心琳
    [
      { id: 'g-3-0', name: '叢晧日', isGuest: false },
      { id: 'g-3-1', name: '王柏詠', isGuest: false },
      { id: 'g-3-2', name: '戴嘉慧', isGuest: false },
      { id: 'g-3-3', name: '葉心琳', isGuest: false },
    ],
    // 列 4：林子晏 / 戴宇星 / 洪宗宏 / 陳俊鳴
    [
      { id: 'g-4-0', name: '林子晏', isGuest: false },
      { id: 'g-4-1', name: '戴宇星', isGuest: false },
      { id: 'g-4-2', name: '洪宗宏', isGuest: false },
      { id: 'g-4-3', name: '陳俊鳴', isGuest: false },
    ],
    // 列 5：黃杰 / 韓政諺 / 洪麗卿 / 黃佳琪
    [
      { id: 'g-5-0', name: '黃杰', isGuest: false },
      { id: 'g-5-1', name: '韓政諺', isGuest: false },
      { id: 'g-5-2', name: '洪麗卿', isGuest: false },
      { id: 'g-5-3', name: '黃佳琪', isGuest: false },
    ],
    // 列 6：王建豐 / 吳振綱 / 王致崴 / 梁文齡
    [
      { id: 'g-6-0', name: '王建豐', isGuest: false },
      { id: 'g-6-1', name: '吳振綱', isGuest: false },
      { id: 'g-6-2', name: '王致崴', isGuest: false },
      { id: 'g-6-3', name: '梁文齡', isGuest: false },
    ],
    // 列 7：馬廷軒 / 黃柔涵 / 邱柏瀚 / 林家均
    [
      { id: 'g-7-0', name: '馬廷軒', isGuest: false },
      { id: 'g-7-1', name: '黃柔涵', isGuest: false },
      { id: 'g-7-2', name: '邱柏瀚', isGuest: false },
      { id: 'g-7-3', name: '林家均', isGuest: false },
    ],
    // 列 8：林塏秢 / 林育群(代理) / 陳志誠 / 黃嘉琪(代理)
    [
      { id: 'g-8-0', name: '林塏秢', isGuest: false },
      { id: 'g-8-1', name: '林育群', isGuest: false, role: '代理' },
      { id: 'g-8-2', name: '陳志誠', isGuest: false },
      { id: 'g-8-3', name: '黃嘉琪', isGuest: false, role: '代理' },
    ],
    // 列 9：張媁淇 / (空) / (空) / (空)
    [
      { id: 'g-9-0', name: '張媁淇', isGuest: false },
      null,
      null,
      null,
    ],
  ],

  sidebar: [],
};
