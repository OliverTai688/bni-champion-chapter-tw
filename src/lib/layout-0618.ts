// 115/06/18 BNI長冠軍分會座位表
// 本週無代理人
// 來賓 7 位
// 值日生與音控：戴宇星

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_0618: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '戴宇星',
  duty:  '戴宇星',

  guests: [
    { number: '賓1', guestName: '劉律均', hostName: '蘇子茵' },
    { number: '賓2', guestName: '謝堯誠', hostName: '叢晧日' },
    { number: '賓3', guestName: '洪志銘', hostName: '馬廷軒' },
    { number: '賓4', guestName: '林柏學', hostName: '林家均' },
    { number: '賓5', guestName: '張雅涵Momo', hostName: '邱柏瀚' },
    { number: '賓6', guestName: '陳奕任', hostName: '田謦蓉' },
    { number: '賓7', guestName: '黃杰', hostName: '邱孟婷' },
  ],

  members: [
    '洪宗宏', '黃佳琪', '吳振綱', '郭子郁', 
    '梁文齡', '黃柔涵', '王致崴', '王建豐', 
    '林子晏', '林道元', '陳宜均', '劉庭羽', 
    '黃嘉琪', '葉心琳', '王柏詠', '陳泓睿', 
    '簡偉志', '黎士銓', '陳志誠', '陳俊鳴', 
    '蘇冠霖', '林塏秢', '程睿紳',
    '蘇子茵', '叢晧日', '馬廷軒', '林家均', 
    '邱柏瀚', '田謦蓉', '邱孟婷', '戴宇星',
  ],

  proxies: [],

  industryChains: [],

  heroes: ['廷軒', '冠霖', '偉志', '道元', '睿紳', '嘉琪', '謦蓉', '又帆', '子宜'],
};

export const LAYOUT_0618: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    [
      { id: 'g-0-0', name: '劉律均', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '謝堯誠', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '洪志銘', isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-3', name: '林柏學', isGuest: true, guestNumber: '賓4' },
    ],
    [
      { id: 'g-1-0', name: '蘇子茵', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '叢晧日', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '馬廷軒', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-3', name: '林家均', isGuest: false, isHost: true, hostFor: '賓4' },
    ],
    [
      { id: 'g-2-0', name: '張雅涵Momo', isGuest: true, guestNumber: '賓5' },
      { id: 'g-2-1', name: '陳奕任', isGuest: true, guestNumber: '賓6' },
      { id: 'g-2-2', name: '黃杰', isGuest: true, guestNumber: '賓7' },
      { id: 'g-2-3', name: '戴宇星', isGuest: false, isDuty: true, isSound: true },
    ],
    [
      { id: 'g-3-0', name: '邱柏瀚', isGuest: false, isHost: true, hostFor: '賓5' },
      { id: 'g-3-1', name: '田謦蓉', isGuest: false, isHost: true, hostFor: '賓6' },
      { id: 'g-3-2', name: '邱孟婷', isGuest: false, isHost: true, hostFor: '賓7' },
      { id: 'g-3-3', name: '洪宗宏', isGuest: false },
    ],
    [
      { id: 'g-4-0', name: '黃佳琪', isGuest: false },
      { id: 'g-4-1', name: '吳振綱', isGuest: false },
      { id: 'g-4-2', name: '郭子郁', isGuest: false },
      { id: 'g-4-3', name: '梁文齡', isGuest: false },
    ],
    [
      { id: 'g-5-0', name: '黃柔涵', isGuest: false },
      { id: 'g-5-1', name: '王致崴', isGuest: false },
      { id: 'g-5-2', name: '王建豐', isGuest: false },
      { id: 'g-5-3', name: '林子晏', isGuest: false },
    ],
    [
      { id: 'g-6-0', name: '林道元', isGuest: false },
      { id: 'g-6-1', name: '陳宜均', isGuest: false },
      { id: 'g-6-2', name: '劉庭羽', isGuest: false },
      { id: 'g-6-3', name: '黃嘉琪', isGuest: false },
    ],
    [
      { id: 'g-7-0', name: '葉心琳', isGuest: false },
      { id: 'g-7-1', name: '王柏詠', isGuest: false },
      { id: 'g-7-2', name: '陳泓睿', isGuest: false },
      { id: 'g-7-3', name: '簡偉志', isGuest: false },
    ],
    [
      { id: 'g-8-0', name: '黎士銓', isGuest: false },
      { id: 'g-8-1', name: '陳志誠', isGuest: false },
      { id: 'g-8-2', name: '陳俊鳴', isGuest: false },
      { id: 'g-8-3', name: '蘇冠霖', isGuest: false },
    ],
    [
      { id: 'g-9-0', name: '林塏秢', isGuest: false },
      { id: 'g-9-1', name: '程睿紳', isGuest: false },
      null,
      null,
    ],
  ],

  sidebar: [],
};
