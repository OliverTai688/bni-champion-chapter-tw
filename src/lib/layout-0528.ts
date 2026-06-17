// 115/05/28 BNI長冠軍分會座位表
// 林育群 回來擔任教育協調
// 程睿紳、梁文齡 本週代理人
// 來賓 9 位
// 值日生：戴宇星；音控：吳振綱

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_0528: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '吳振綱',
  duty:  '戴宇星',

  guests: [
    { number: '賓1', guestName: '李昭瑩', hostName: '林家均' },
    { number: '賓2', guestName: '柯延婷', hostName: '蘇子茵' },
    { number: '賓3', guestName: '王吟方', hostName: '田謦蓉' },
    { number: '賓4', guestName: '林柏學', hostName: '馬廷軒' },
    { number: '賓5', guestName: '邱Starex', hostName: '蘇冠霖' },
    { number: '賓6', guestName: '徐瑋村', hostName: '黎士銓' },
    { number: '賓7', guestName: '鄭季涵', hostName: '邱孟婷' },
    { number: '賓8', guestName: '邱凡華', hostName: '叢晧日' },
    { number: '賓9', guestName: '吳潓瑄', hostName: '林塏秢' },
  ],

  members: [
    '王致崴', '郭子郁', '陳志誠', '黃嘉琪',
    '黃佳琪', '葉心琳', '陳俊鳴', '林道元',
    '王柏詠', '陳泓睿', '陳宜均', '邱柏瀚',
    '王建豐', '黃柔涵', '劉庭羽', '簡偉志',
    '洪宗宏',
  ],

  proxies: ['程睿紳', '梁文齡'],

  industryChains: [],

  heroes: ['家均', '子茵', '宗宏', '嘉琪', '偉志', '子宜'],
};

export const LAYOUT_0528: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    [
      { id: 'g-0-0', name: '李昭瑩', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '柯延婷', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '王吟方', isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-3', name: '戴宇星', isGuest: false, isDuty: true },
    ],
    [
      { id: 'g-1-0', name: '林家均', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '蘇子茵', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '田謦蓉', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-3', name: '吳振綱', isGuest: false, isSound: true },
    ],
    [
      { id: 'g-2-0', name: '林柏學', isGuest: true, guestNumber: '賓4' },
      { id: 'g-2-1', name: '邱Starex', isGuest: true, guestNumber: '賓5' },
      { id: 'g-2-2', name: '徐瑋村', isGuest: true, guestNumber: '賓6' },
      { id: 'g-2-3', name: '鄭季涵', isGuest: true, guestNumber: '賓7' },
    ],
    [
      { id: 'g-3-0', name: '馬廷軒', isGuest: false, isHost: true, hostFor: '賓4' },
      { id: 'g-3-1', name: '蘇冠霖', isGuest: false, isHost: true, hostFor: '賓5' },
      { id: 'g-3-2', name: '黎士銓', isGuest: false, isHost: true, hostFor: '賓6' },
      { id: 'g-3-3', name: '邱孟婷', isGuest: false, isHost: true, hostFor: '賓7' },
    ],
    [
      { id: 'g-4-0', name: '邱凡華', isGuest: true, guestNumber: '賓8' },
      { id: 'g-4-1', name: '吳潓瑄', isGuest: true, guestNumber: '賓9' },
      { id: 'g-4-2', name: '陳志誠', isGuest: false },
      { id: 'g-4-3', name: '王致崴', isGuest: false },
    ],
    [
      { id: 'g-5-0', name: '叢晧日', isGuest: false, isHost: true, hostFor: '賓8' },
      { id: 'g-5-1', name: '林塏秢', isGuest: false, isHost: true, hostFor: '賓9' },
      { id: 'g-5-2', name: '郭子郁', isGuest: false },
      { id: 'g-5-3', name: '黃嘉琪', isGuest: false },
    ],
    [
      { id: 'g-6-0', name: '黃佳琪', isGuest: false },
      { id: 'g-6-1', name: '葉心琳', isGuest: false },
      { id: 'g-6-2', name: '陳俊鳴', isGuest: false },
      { id: 'g-6-3', name: '林道元', isGuest: false },
    ],
    [
      { id: 'g-7-0', name: '王柏詠', isGuest: false },
      { id: 'g-7-1', name: '陳泓睿', isGuest: false },
      { id: 'g-7-2', name: '陳宜均', isGuest: false },
      { id: 'g-7-3', name: '邱柏瀚', isGuest: false },
    ],
    [
      { id: 'g-8-0', name: '王建豐', isGuest: false },
      { id: 'g-8-1', name: '黃柔涵', isGuest: false },
      { id: 'g-8-2', name: '劉庭羽', isGuest: false },
      { id: 'g-8-3', name: '洪宗宏', isGuest: false },
    ],
    [
      { id: 'g-9-0', name: '簡偉志', isGuest: false },
      { id: 'g-9-1', name: '程睿紳', isGuest: false, role: '代理' },
      { id: 'g-9-2', name: '梁文齡', isGuest: false, role: '代理' },
      null,
    ],
  ],

  sidebar: [],
};
