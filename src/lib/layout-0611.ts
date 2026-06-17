// 115/06/11 BNI長冠軍分會座位表
// 本週代理人: 叢皓日、戴宇星
// 來賓 3 位
// 值日生：吳振綱；音控：郭子郁

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_0611: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '郭子郁',
  duty:  '吳振綱',

  guests: [
    { number: '賓1', guestName: '周信廷', hostName: '林家均' },
    { number: '賓2', guestName: '黃千芬', hostName: '黎士銓' },
    { number: '賓3', guestName: '劉道玄', hostName: '林塏秢' },
  ],

  members: [
    '林子晏', '馬廷軒', '洪宗宏', '黃佳琪', '蘇子茵',
    '田謦蓉', '王致崴', '王建豐', '邱孟婷', '林道元',
    '陳宜均', '劉庭羽', '黃嘉琪', '邱柏瀚', '王柏詠',
    '陳泓睿', '簡偉志', '陳俊鳴', '蘇冠霖', '陳志誠',
    '梁文齡', '黃柔涵', '程睿紳',
  ],

  proxies: ['叢晧日', '戴宇星', '葉心琳'],

  industryChains: [],

  heroes: ['柏瀚', '媁淇', '文齡', '庭羽', '又帆', '廷軒', '冠霖', '偉志', '子宜'],
};

export const LAYOUT_0611: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    [
      { id: 'g-0-0', name: '周信廷', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '黃千芬', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '劉道玄', isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-3', name: '吳振綱', isGuest: false, isDuty: true },
    ],
    [
      { id: 'g-1-0', name: '林家均', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '黎士銓', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '林塏秢', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-3', name: '郭子郁', isGuest: false, isSound: true },
    ],
    [
      { id: 'g-2-0', name: '林子晏', isGuest: false },
      { id: 'g-2-1', name: '馬廷軒', isGuest: false },
      { id: 'g-2-2', name: '洪宗宏', isGuest: false },
      { id: 'g-2-3', name: '黃佳琪', isGuest: false },
    ],
    [
      { id: 'g-3-0', name: '蘇子茵', isGuest: false },
      { id: 'g-3-1', name: '田謦蓉', isGuest: false },
      { id: 'g-3-2', name: '王致崴', isGuest: false },
      { id: 'g-3-3', name: '王建豐', isGuest: false },
    ],
    [
      { id: 'g-4-0', name: '邱孟婷', isGuest: false },
      { id: 'g-4-1', name: '林道元', isGuest: false },
      { id: 'g-4-2', name: '陳宜均', isGuest: false },
      { id: 'g-4-3', name: '劉庭羽', isGuest: false },
    ],
    [
      { id: 'g-5-0', name: '黃嘉琪', isGuest: false },
      { id: 'g-5-1', name: '邱柏瀚', isGuest: false },
      { id: 'g-5-2', name: '王柏詠', isGuest: false },
      { id: 'g-5-3', name: '陳泓睿', isGuest: false },
    ],
    [
      { id: 'g-6-0', name: '簡偉志', isGuest: false },
      { id: 'g-6-1', name: '陳俊鳴', isGuest: false },
      { id: 'g-6-2', name: '蘇冠霖', isGuest: false },
      { id: 'g-6-3', name: '陳志誠', isGuest: false },
    ],
    [
      { id: 'g-7-0', name: '梁文齡', isGuest: false },
      { id: 'g-7-1', name: '黃柔涵', isGuest: false },
      { id: 'g-7-2', name: '程睿紳', isGuest: false },
      { id: 'g-7-3', name: '叢晧日', isGuest: false, role: '代理' },
    ],
    [
      { id: 'g-8-0', name: '戴宇星', isGuest: false, role: '代理' },
      { id: 'g-8-1', name: '葉心琳', isGuest: false, role: '代理' },
      null,
      null,
    ],
  ],

  sidebar: [],
};
