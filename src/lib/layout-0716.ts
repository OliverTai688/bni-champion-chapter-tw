// 115/07/16 BNI長冠軍分會座位表
// 值日生：致崴  音控：子郁
// 來賓 4 位
// 代理人：戴宇星

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_0716: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '郭子郁',
  duty:  '王致崴',

  guests: [
    { number: '賓1', guestName: '葉子豪', hostName: '邱孟婷' },
    { number: '賓2', guestName: '梁訓銘', hostName: '田謦蓉' },
    { number: '賓3', guestName: '羅士翔', hostName: '叢晧日' },
    { number: '賓4', guestName: '馮羿嘉', hostName: '邱柏瀚' },
  ],

  members: [
    '王柏詠', '黃佳琪', '林家均', '林子晏', '陳宜均', 
    '陳泓睿', '黃柔涵', '黃嘉琪', '王建豐', '蘇子茵', 
    '洪宗宏', '黃杰', '洪麗卿', '韓政諺', 
    '陳俊鳴', '馬廷軒', '葉心琳', '陳志誠', 
    '程睿紳', '吳振綱', '梁文齡', '林道元', '黎士銓', '蘇冠霖',
    '劉庭羽', '林塏秢'
  ],

  proxies: ['戴宇星'],

  industryChains: [],

  heroes: ['宜均', '致崴', '俊鳴', '道元', '睿紳', '宗宏', '又帆', '子宜'],
};

export const LAYOUT_0716: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0
    [
      { id: 'g-0-0', name: '葉子豪', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '梁訓銘', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '羅士翔', isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-3', name: '王致崴', isGuest: false, isDuty: true },
    ],
    // 列 1
    [
      { id: 'g-1-0', name: '邱孟婷', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '田謦蓉', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '叢晧日', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-3', name: '郭子郁', isGuest: false, isSound: true },
    ],
    // 列 2
    [
      { id: 'g-2-0', name: '馮羿嘉', isGuest: true, guestNumber: '賓4' },
      { id: 'g-2-1', name: '王建豐', isGuest: false },
      { id: 'g-2-2', name: '蘇冠霖', isGuest: false },
      { id: 'g-2-3', name: '馬廷軒', isGuest: false },
    ],
    // 列 3
    [
      { id: 'g-3-0', name: '邱柏瀚', isGuest: false, isHost: true, hostFor: '賓4' },
      { id: 'g-3-1', name: '洪麗卿', isGuest: false },
      { id: 'g-3-2', name: '吳振綱', isGuest: false },
      { id: 'g-3-3', name: '黃杰', isGuest: false },
    ],
    // 列 4
    [
      { id: 'g-4-0', name: '韓政諺', isGuest: false },
      { id: 'g-4-1', name: '蘇子茵', isGuest: false },
      { id: 'g-4-2', name: '梁文齡', isGuest: false },
      { id: 'g-4-3', name: '黎士銓', isGuest: false },
    ],
    // 列 5
    [
      { id: 'g-5-0', name: '洪宗宏', isGuest: false },
      { id: 'g-5-1', name: '林家均', isGuest: false },
      { id: 'g-5-2', name: '林子晏', isGuest: false },
      { id: 'g-5-3', name: '陳宜均', isGuest: false },
    ],
    // 列 6
    [
      { id: 'g-6-0', name: '劉庭羽', isGuest: false },
      { id: 'g-6-1', name: '黃嘉琪', isGuest: false },
      { id: 'g-6-2', name: '葉心琳', isGuest: false },
      { id: 'g-6-3', name: '林道元', isGuest: false },
    ],
    // 列 7
    [
      { id: 'g-7-0', name: '程睿紳', isGuest: false },
      { id: 'g-7-1', name: '陳泓睿', isGuest: false },
      { id: 'g-7-2', name: '王柏詠', isGuest: false },
      { id: 'g-7-3', name: '黃佳琪', isGuest: false },
    ],
    // 列 8
    [
      { id: 'g-8-0', name: '戴宇星', isGuest: false, role: '代理' },
      { id: 'g-8-1', name: '陳俊鳴', isGuest: false },
      { id: 'g-8-2', name: '陳志誠', isGuest: false },
      { id: 'g-8-3', name: '林塏秢', isGuest: false },
    ],
    // 列 9
    [
      { id: 'g-9-0', name: '黃柔涵', isGuest: false },
      null,
      null,
      null,
    ],
  ],

  sidebar: [],
};
