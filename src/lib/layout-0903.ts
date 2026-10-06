// 115/09/03 BNI長冠軍分會座位表
// 值日生：吳振綱  音控：林道元
// 來賓 1 位：鄭蘭香（執事：田謦蓉）
// 教育協調：黎士銓（原林育群，本週育群改任代理人）
// 代理人：邱孟婷、馬廷軒、黃杰、蘇子茵、林育群、王柏詠
// 本週固定出席 36 人 + 王致崴、蘇冠霖補位出席 = 38 人（全分會名冊）
// 英雄榜：Mecco 👉 Mina宜均 👉 政諺 👉 子郁 👉 嘉琪 👉 又帆

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_0903: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '黎士銓' },
  ],

  sound: '林道元',
  duty:  '吳振綱',

  guests: [
    { number: '賓1', guestName: '鄭蘭香', hostName: '田謦蓉' },
  ],

  members: [
    '韓政諺', '洪麗卿', '林子晏', '黃柔涵',
    '叢晧日', '陳宜均', '郭子郁', '黃嘉琪',
    '王建豐', '戴宇星', '陳泓睿', '洪宗宏',
    '梁文齡', '劉庭羽', '葉心琳', '邱柏瀚',
    '林家均', '程睿紳', '黃佳琪', '陳志誠',
    '陳俊鳴', '林塏秢', '王致崴', '蘇冠霖',
  ],

  proxies: ['邱孟婷', '馬廷軒', '黃杰', '蘇子茵', '林育群', '王柏詠'],

  industryChains: [],

  heroes: ['Mecco', '陳宜均', '韓政諺', '郭子郁', '黃嘉琪', '古又帆'],
};

export const LAYOUT_0903: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '黎士銓', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓 1 + 值日生
    [
      { id: 'g-0-0', name: '鄭蘭香', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '吳振綱', isGuest: false, isDuty: true },
      null,
      null,
    ],
    // 列 1：執事(帶賓) + 音控
    [
      { id: 'g-1-0', name: '田謦蓉', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '林道元', isGuest: false, isSound: true },
      null,
      null,
    ],
    // 列 2
    [
      { id: 'g-2-0', name: '韓政諺', isGuest: false },
      { id: 'g-2-1', name: '洪麗卿', isGuest: false },
      { id: 'g-2-2', name: '林子晏', isGuest: false },
      { id: 'g-2-3', name: '黃柔涵', isGuest: false },
    ],
    // 列 3：英雄榜相關
    [
      { id: 'g-3-0', name: '叢晧日', isGuest: false },
      { id: 'g-3-1', name: '陳宜均', isGuest: false },
      { id: 'g-3-2', name: '郭子郁', isGuest: false },
      { id: 'g-3-3', name: '黃嘉琪', isGuest: false },
    ],
    // 列 4
    [
      { id: 'g-4-0', name: '王建豐', isGuest: false },
      { id: 'g-4-1', name: '戴宇星', isGuest: false },
      { id: 'g-4-2', name: '陳泓睿', isGuest: false },
      { id: 'g-4-3', name: '洪宗宏', isGuest: false },
    ],
    // 列 5
    [
      { id: 'g-5-0', name: '梁文齡', isGuest: false },
      { id: 'g-5-1', name: '劉庭羽', isGuest: false },
      { id: 'g-5-2', name: '葉心琳', isGuest: false },
      { id: 'g-5-3', name: '邱柏瀚', isGuest: false },
    ],
    // 列 6
    [
      { id: 'g-6-0', name: '林家均', isGuest: false },
      { id: 'g-6-1', name: '程睿紳', isGuest: false },
      { id: 'g-6-2', name: '黃佳琪', isGuest: false },
      { id: 'g-6-3', name: '陳志誠', isGuest: false },
    ],
    // 列 7：黎士銓改任教育協調、王柏詠改任代理人移出原席位，王致崴、蘇冠霖本週補位出席
    [
      { id: 'g-7-0', name: '陳俊鳴', isGuest: false },
      { id: 'g-7-1', name: '林塏秢', isGuest: false },
      { id: 'g-7-2', name: '王致崴', isGuest: false },
      { id: 'g-7-3', name: '蘇冠霖', isGuest: false },
    ],
    // 列 8：代理人
    [
      { id: 'g-8-0', name: '邱孟婷', isGuest: false, role: '代理' },
      { id: 'g-8-1', name: '馬廷軒', isGuest: false, role: '代理' },
      { id: 'g-8-2', name: '黃杰',   isGuest: false, role: '代理' },
      { id: 'g-8-3', name: '蘇子茵', isGuest: false, role: '代理' },
    ],
    // 列 9：代理人（新增）
    [
      { id: 'g-9-0', name: '林育群', isGuest: false, role: '代理' },
      { id: 'g-9-1', name: '王柏詠', isGuest: false, role: '代理' },
      null,
      null,
    ],
  ],

  sidebar: [],
};
