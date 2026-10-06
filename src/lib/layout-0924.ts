// 115/09/24 BNI長冠軍分會座位表
// 值日生：吳振綱  音控：林道元
// 來賓 6 位（格局：來賓正後方為對應執事）
// 代理人：程睿紳、林家均（家均代理人坐嘉琪旁）、洪宗宏（Eason吳代理，會員自行登記）
//
// 座位依 09/23 23:39 頁面儲存版本排列（browser-draft v2）
// 副主席：黃子宜（09/17 由叢晧日代，本週晧日擔任執事）
// 英雄榜：心琳 👉 子晏 👉 宇星 👉 Mecco 👉 Mina 👉 嘉琪 👉 又帆

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_0924: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '林道元',
  duty:  '吳振綱',

  guests: [
    { number: '賓1', guestName: '羅怡乃',   hostName: '馬廷軒' },
    { number: '賓2', guestName: '黃聖元',   hostName: '田謦蓉' },
    { number: '賓3', guestName: '林祐聖',   hostName: '林塏秢' },
    { number: '賓4', guestName: '河野正譽', hostName: '邱孟婷' },
    { number: '賓5', guestName: '譚旭良',   hostName: '蘇子茵' },
    { number: '賓6', guestName: '葉長霖',   hostName: '叢晧日' },
  ],

  members: [
    '黃嘉琪', '葉心琳', '林子晏', '戴宇星',
    '陳宜均', '韓政諺', '黃杰', '陳俊鳴',
    '洪麗卿', '黃佳琪', '王建豐', '郭子郁',
    '王致崴', '劉庭羽', '梁文齡',
    '邱柏瀚', '黎士銓', '蘇冠霖',
    '陳志誠', '黃柔涵', '王柏詠', '陳泓睿',
  ],

  proxies: ['程睿紳', '林家均', '洪宗宏'],

  industryChains: [],

  heroes: ['葉心琳', '林子晏', '戴宇星', 'Mecco', '陳宜均', '黃嘉琪', '古又帆'],
};

export const LAYOUT_0924: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓1 / 賓2 / 賓3 / 吳振綱(值日生)
    [
      { id: 'g-0-0', name: '羅怡乃', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '黃聖元', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '林祐聖', isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-3', name: '吳振綱', isGuest: false, isDuty: true },
    ],
    // 列 1：馬廷軒(執·賓1) / 田謦蓉(執·賓2) / 林塏秢(執·賓3) / 林道元(音控)
    [
      { id: 'g-1-0', name: '馬廷軒', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '田謦蓉', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '林塏秢', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-3', name: '林道元', isGuest: false, isSound: true },
    ],
    // 列 2：賓4 / 賓5 / 賓6 / 陳宜均
    [
      { id: 'g-2-0', name: '河野正譽', isGuest: true, guestNumber: '賓4' },
      { id: 'g-2-1', name: '譚旭良', isGuest: true, guestNumber: '賓5' },
      { id: 'g-2-2', name: '葉長霖', isGuest: true, guestNumber: '賓6' },
      { id: 'g-2-3', name: '陳宜均', isGuest: false },
    ],
    // 列 3：邱孟婷(執·賓4) / 蘇子茵(執·賓5) / 叢晧日(執·賓6) / 葉心琳
    [
      { id: 'g-3-0', name: '邱孟婷', isGuest: false, isHost: true, hostFor: '賓4' },
      { id: 'g-3-1', name: '蘇子茵', isGuest: false, isHost: true, hostFor: '賓5' },
      { id: 'g-3-2', name: '叢晧日', isGuest: false, isHost: true, hostFor: '賓6' },
      { id: 'g-3-3', name: '葉心琳', isGuest: false },
    ],
    // 列 4：林子晏 / 戴宇星 / 洪宗宏(代理) / 黎士銓
    [
      { id: 'g-4-0', name: '林子晏', isGuest: false },
      { id: 'g-4-1', name: '戴宇星', isGuest: false },
      { id: 'g-4-2', name: '洪宗宏', isGuest: false, role: '代理' },
      { id: 'g-4-3', name: '黎士銓', isGuest: false },
    ],
    // 列 5：黃杰 / 韓政諺 / 洪麗卿 / 黃佳琪
    [
      { id: 'g-5-0', name: '黃杰', isGuest: false },
      { id: 'g-5-1', name: '韓政諺', isGuest: false },
      { id: 'g-5-2', name: '洪麗卿', isGuest: false },
      { id: 'g-5-3', name: '黃佳琪', isGuest: false },
    ],
    // 列 6：王建豐 / 郭子郁 / 王致崴 / 黃嘉琪
    [
      { id: 'g-6-0', name: '王建豐', isGuest: false },
      { id: 'g-6-1', name: '郭子郁', isGuest: false },
      { id: 'g-6-2', name: '王致崴', isGuest: false },
      { id: 'g-6-3', name: '黃嘉琪', isGuest: false },
    ],
    // 列 7：劉庭羽 / 黃柔涵 / 邱柏瀚 / 林家均(代理)
    [
      { id: 'g-7-0', name: '劉庭羽', isGuest: false },
      { id: 'g-7-1', name: '黃柔涵', isGuest: false },
      { id: 'g-7-2', name: '邱柏瀚', isGuest: false },
      { id: 'g-7-3', name: '林家均', isGuest: false, role: '代理' },
    ],
    // 列 8：蘇冠霖 / 陳俊鳴 / 陳志誠 / 梁文齡
    [
      { id: 'g-8-0', name: '蘇冠霖', isGuest: false },
      { id: 'g-8-1', name: '陳俊鳴', isGuest: false },
      { id: 'g-8-2', name: '陳志誠', isGuest: false },
      { id: 'g-8-3', name: '梁文齡', isGuest: false },
    ],
    // 列 9：王柏詠 / 陳泓睿 / 程睿紳(代理) / (空)
    [
      { id: 'g-9-0', name: '王柏詠', isGuest: false },
      { id: 'g-9-1', name: '陳泓睿', isGuest: false },
      { id: 'g-9-2', name: '程睿紳', isGuest: false, role: '代理' },
      null,
    ],
  ],

  sidebar: [],
};
