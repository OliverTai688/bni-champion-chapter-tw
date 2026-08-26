// 115/08/27 BNI長冠軍分會座位表
// 值日生：王致崴  音控：林道元
// 來賓 3 位
// 代理人：無

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_0827: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '林道元',
  duty:  '王致崴',

  guests: [
    { number: '賓1', guestName: '胡天俊', hostName: '邱孟婷' },
    { number: '賓2', guestName: '許瀚仁', hostName: '蘇冠霖' },
    { number: '賓3', guestName: '杜文魁', hostName: '田謦蓉' },
  ],

  members: [
    '韓政諺', '洪麗卿', '林子晏', '蘇子茵',
    '林塏秢', '王建豐', '戴宇星', '陳泓睿',
    '馬廷軒', '洪宗宏', '梁文齡', '劉庭羽',
    '黎士銓', '葉心琳', '邱柏瀚', '黃柔涵',
    '林家均', '陳宜均', '程睿紳', '黃佳琪',
    '黃嘉琪', '陳志誠', '陳俊鳴', '王柏詠',
    '黃杰', '叢晧日', '吳振綱', '郭子郁'
  ],

  proxies: [],

  industryChains: [],

  heroes: ['蘇子茵', '林塏秢', '王建豐', '戴宇星', '陳泓睿', '黃子宜'],
};

export const LAYOUT_0827: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓 1, 2, 3 + 值日生
    [
      { id: 'g-0-0', name: '胡天俊', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '許瀚仁', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '杜文魁', isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-3', name: '王致崴', isGuest: false, isDuty: true },
    ],
    // 列 1：主 1, 2, 3 + 音控
    [
      { id: 'g-1-0', name: '邱孟婷', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '蘇冠霖', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '田謦蓉', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-3', name: '林道元', isGuest: false, isSound: true },
    ],
    // 列 2：特別前排 (韓政諺、洪麗卿、林子晏、黃杰)
    [
      { id: 'g-2-0', name: '韓政諺', isGuest: false },
      { id: 'g-2-1', name: '洪麗卿', isGuest: false },
      { id: 'g-2-2', name: '林子晏', isGuest: false },
      { id: 'g-2-3', name: '黃杰', isGuest: false },
    ],
    // 列 3：英雄 1, 2, 3, 4 (蘇子茵, 塏秢, 建豐, 宇星)
    [
      { id: 'g-3-0', name: '蘇子茵', isGuest: false },
      { id: 'g-3-1', name: '林塏秢', isGuest: false },
      { id: 'g-3-2', name: '王建豐', isGuest: false },
      { id: 'g-3-3', name: '戴宇星', isGuest: false },
    ],
    // 列 4：英雄 5 (陳泓睿) + 馬廷軒, 洪宗宏, 梁文齡
    [
      { id: 'g-4-0', name: '陳泓睿', isGuest: false },
      { id: 'g-4-1', name: '馬廷軒', isGuest: false },
      { id: 'g-4-2', name: '洪宗宏', isGuest: false },
      { id: 'g-4-3', name: '梁文齡', isGuest: false },
    ],
    // 列 5
    [
      { id: 'g-5-0', name: '劉庭羽', isGuest: false },
      { id: 'g-5-1', name: '黎士銓', isGuest: false },
      { id: 'g-5-2', name: '葉心琳', isGuest: false },
      { id: 'g-5-3', name: '邱柏瀚', isGuest: false },
    ],
    // 列 6
    [
      { id: 'g-6-0', name: '黃柔涵', isGuest: false },
      { id: 'g-6-1', name: '林家均', isGuest: false },
      { id: 'g-6-2', name: '陳宜均', isGuest: false },
      { id: 'g-6-3', name: '程睿紳', isGuest: false },
    ],
    // 列 7
    [
      { id: 'g-7-0', name: '黃佳琪', isGuest: false },
      { id: 'g-7-1', name: '黃嘉琪', isGuest: false },
      { id: 'g-7-2', name: '陳志誠', isGuest: false },
      { id: 'g-7-3', name: '陳俊鳴', isGuest: false },
    ],
    // 列 8
    [
      { id: 'g-8-0', name: '王柏詠', isGuest: false },
      { id: 'g-8-1', name: '叢晧日', isGuest: false },
      { id: 'g-8-2', name: '吳振綱', isGuest: false },
      { id: 'g-8-3', name: '郭子郁', isGuest: false },
    ],
    // 列 9
    [
      null,
      null,
      null,
      null,
    ],
  ],

  sidebar: [],
};
