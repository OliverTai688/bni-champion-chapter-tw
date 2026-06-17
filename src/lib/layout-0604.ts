// 115/06/04 BNI長冠軍分會座位表
// 本週代理人: 柔涵, 睿紳, 文齡
// 來賓 6 位
// 值日生：郭子郁；音控：林道元

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_0604: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '林道元',
  duty:  '郭子郁',

  guests: [
    { number: '賓1', guestName: '黃淘', hostName: '陳志誠' },
    { number: '賓2', guestName: '張雅涵', hostName: '叢晧日' },
    { number: '賓3', guestName: '張銀峻', hostName: '林家均' },
    { number: '賓4', guestName: '鄭先萌', hostName: '馬廷軒' },
    { number: '賓5', guestName: '蔡廷語', hostName: '蘇子茵' },
    { number: '賓6', guestName: '鄭人瑄', hostName: '黎士銓' },
  ],

  members: [
    '洪宗宏', '黃佳琪', '吳振綱', '田謦蓉', '王致崴', '王建豐',
    '邱孟婷', '陳宜均', '劉庭羽', '黃嘉琪', '邱柏瀚', '王柏詠',
    '陳泓睿', '簡偉志', '戴宇星', '陳俊鳴', '蘇冠霖', '林塏秢'
  ],

  proxies: ['黃柔涵', '程睿紳', '梁文齡'],

  industryChains: [],

  heroes: ['廷軒', '冠霖', '泓睿', '又帆', '嘉琪', '晧日', '媁淇', '偉志', '子宜'],
};

export const LAYOUT_0604: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    [
      { id: 'g-0-0', name: '黃淘', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '張雅涵', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '張銀峻', isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-3', name: '郭子郁', isGuest: false, isDuty: true },
    ],
    [
      { id: 'g-1-0', name: '陳志誠', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '叢晧日', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '林家均', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-3', name: '林道元', isGuest: false, isSound: true },
    ],
    [
      { id: 'g-2-0', name: '鄭先萌', isGuest: true, guestNumber: '賓4' },
      { id: 'g-2-1', name: '蔡廷語', isGuest: true, guestNumber: '賓5' },
      { id: 'g-2-2', name: '鄭人瑄', isGuest: true, guestNumber: '賓6' },
      { id: 'g-2-3', name: '洪宗宏', isGuest: false },
    ],
    [
      { id: 'g-3-0', name: '馬廷軒', isGuest: false, isHost: true, hostFor: '賓4' },
      { id: 'g-3-1', name: '蘇子茵', isGuest: false, isHost: true, hostFor: '賓5' },
      { id: 'g-3-2', name: '黎士銓', isGuest: false, isHost: true, hostFor: '賓6' },
      { id: 'g-3-3', name: '黃佳琪', isGuest: false },
    ],
    [
      { id: 'g-4-0', name: '吳振綱', isGuest: false },
      { id: 'g-4-1', name: '田謦蓉', isGuest: false },
      { id: 'g-4-2', name: '王致崴', isGuest: false },
      { id: 'g-4-3', name: '王建豐', isGuest: false },
    ],
    [
      { id: 'g-5-0', name: '邱孟婷', isGuest: false },
      { id: 'g-5-1', name: '陳宜均', isGuest: false },
      { id: 'g-5-2', name: '劉庭羽', isGuest: false },
      { id: 'g-5-3', name: '黃嘉琪', isGuest: false },
    ],
    [
      { id: 'g-6-0', name: '邱柏瀚', isGuest: false },
      { id: 'g-6-1', name: '王柏詠', isGuest: false },
      { id: 'g-6-2', name: '陳泓睿', isGuest: false },
      { id: 'g-6-3', name: '簡偉志', isGuest: false },
    ],
    [
      { id: 'g-7-0', name: '戴宇星', isGuest: false },
      { id: 'g-7-1', name: '陳俊鳴', isGuest: false },
      { id: 'g-7-2', name: '蘇冠霖', isGuest: false },
      { id: 'g-7-3', name: '林塏秢', isGuest: false },
    ],
    [
      { id: 'g-8-0', name: '黃柔涵', isGuest: false, role: '代理' },
      { id: 'g-8-1', name: '程睿紳', isGuest: false, role: '代理' },
      { id: 'g-8-2', name: '梁文齡', isGuest: false, role: '代理' },
      null,
    ],
  ],

  sidebar: [],
};
