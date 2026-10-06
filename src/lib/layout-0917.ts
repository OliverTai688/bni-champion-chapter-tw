// 115/09/17 BNI長冠軍分會座位表
// 值日生：王致崴  音控：郭子郁
// 來賓 9 位（格局：來賓正後方為對應執事）
// 教育協調：林育群（09/03 由黎士銓代，本週士銓擔任執事）
// 代理人：王柏詠、黃柔涵（林英傑代理，會員自行登記）、黃子宜、陳宜均、陳泓睿
// 副主席：叢晧日（原黃子宜，本週子宜改任代理人）
// 英雄榜：道元 👉 Jimmy 👉 心琳 👉 Mecco 👉 Mina 👉 嘉琪 👉 又帆
//
// 座位依 09/16 18:04 頁面儲存版本排列（黃柔涵由林英傑代理）

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_0917: Roster = {
  hostTeam: [
    { role: '活動協調', name: '張媁淇' },
    { role: '財務秘書', name: '戴嘉慧' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '叢晧日' },
    { role: '教育協調', name: '林育群' },
  ],

  sound: '郭子郁',
  duty:  '王致崴',

  guests: [
    { number: '賓1', guestName: '蔡宗翰', hostName: '馬廷軒' },
    { number: '賓2', guestName: '丁宇億', hostName: '蘇冠霖' },
    { number: '賓3', guestName: '連彥婷', hostName: '田謦蓉' },
    { number: '賓4', guestName: '應薇巧', hostName: '林家均' },
    { number: '賓5', guestName: '陳莉珍', hostName: '邱柏瀚' },
    { number: '賓6', guestName: '陳軾',   hostName: '黎士銓' },
    { number: '賓7', guestName: '潘沐宣', hostName: '蘇子茵' },
    { number: '賓8', guestName: '賴奕道', hostName: '陳志誠' },
    { number: '賓9', guestName: '蔡昀蓉', hostName: '梁文齡' },
  ],

  members: [
    '黃嘉琪', '林子晏', '葉心琳', '韓政諺',
    '黃杰', '陳俊鳴', '洪麗卿', '黃佳琪',
    '吳振綱', '王建豐', '戴宇星', '林道元',
    '洪宗宏', '劉庭羽', '程睿紳', '林塏秢',
    '邱孟婷',
  ],

  proxies: ['陳泓睿', '王柏詠', '黃柔涵', '黃子宜', '陳宜均'],

  industryChains: [],

  heroes: ['林道元', 'Jimmy', '葉心琳', 'Mecco', '陳宜均', '黃嘉琪', '古又帆'],
};

export const LAYOUT_0917: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '張媁淇', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '戴嘉慧', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '叢晧日', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '林育群', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓9 / 賓2 / 賓3 / 王致崴(值日生)
    [
      { id: 'g-0-0', name: '蔡昀蓉', isGuest: true, guestNumber: '賓9' },
      { id: 'g-0-1', name: '丁宇億', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '連彥婷', isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-3', name: '王致崴', isGuest: false, isDuty: true },
    ],
    // 列 1：梁文齡(執·賓9) / 蘇冠霖(執·賓2) / 田謦蓉(執·賓3) / 郭子郁(音控)
    [
      { id: 'g-1-0', name: '梁文齡', isGuest: false, isHost: true, hostFor: '賓9' },
      { id: 'g-1-1', name: '蘇冠霖', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '田謦蓉', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-3', name: '郭子郁', isGuest: false, isSound: true },
    ],
    // 列 2：賓5 / 賓6 / 賓7 / 黃嘉琪
    [
      { id: 'g-2-0', name: '陳莉珍', isGuest: true, guestNumber: '賓5' },
      { id: 'g-2-1', name: '陳軾', isGuest: true, guestNumber: '賓6' },
      { id: 'g-2-2', name: '潘沐宣', isGuest: true, guestNumber: '賓7' },
      { id: 'g-2-3', name: '黃嘉琪', isGuest: false },
    ],
    // 列 3：邱柏瀚(執·賓5) / 黎士銓(執·賓6) / 蘇子茵(執·賓7) / 陳志誠(執·賓8)
    [
      { id: 'g-3-0', name: '邱柏瀚', isGuest: false, isHost: true, hostFor: '賓5' },
      { id: 'g-3-1', name: '黎士銓', isGuest: false, isHost: true, hostFor: '賓6' },
      { id: 'g-3-2', name: '蘇子茵', isGuest: false, isHost: true, hostFor: '賓7' },
      { id: 'g-3-3', name: '陳志誠', isGuest: false, isHost: true, hostFor: '賓8' },
    ],
    // 列 4：林子晏 / 賓4 / 葉心琳 / 賓8
    [
      { id: 'g-4-0', name: '林子晏', isGuest: false },
      { id: 'g-4-1', name: '應薇巧', isGuest: true, guestNumber: '賓4' },
      { id: 'g-4-2', name: '葉心琳', isGuest: false },
      { id: 'g-4-3', name: '賴奕道', isGuest: true, guestNumber: '賓8' },
    ],
    // 列 5：賓1 / 林家均(執·賓4) / 韓政諺 / 黃杰
    [
      { id: 'g-5-0', name: '蔡宗翰', isGuest: true, guestNumber: '賓1' },
      { id: 'g-5-1', name: '林家均', isGuest: false, isHost: true, hostFor: '賓4' },
      { id: 'g-5-2', name: '韓政諺', isGuest: false },
      { id: 'g-5-3', name: '黃杰', isGuest: false },
    ],
    // 列 6：馬廷軒(執·賓1) / 陳俊鳴 / 洪麗卿 / 黃佳琪
    [
      { id: 'g-6-0', name: '馬廷軒', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-6-1', name: '陳俊鳴', isGuest: false },
      { id: 'g-6-2', name: '洪麗卿', isGuest: false },
      { id: 'g-6-3', name: '黃佳琪', isGuest: false },
    ],
    // 列 7：吳振綱 / 王建豐 / 戴宇星 / 林道元
    [
      { id: 'g-7-0', name: '吳振綱', isGuest: false },
      { id: 'g-7-1', name: '王建豐', isGuest: false },
      { id: 'g-7-2', name: '戴宇星', isGuest: false },
      { id: 'g-7-3', name: '林道元', isGuest: false },
    ],
    // 列 8：洪宗宏 / 劉庭羽 / 程睿紳 / 陳泓睿(代理)
    [
      { id: 'g-8-0', name: '洪宗宏', isGuest: false },
      { id: 'g-8-1', name: '劉庭羽', isGuest: false },
      { id: 'g-8-2', name: '程睿紳', isGuest: false },
      { id: 'g-8-3', name: '陳泓睿', isGuest: false, role: '代理' },
    ],
    // 列 9：王柏詠(代理) / 林塏秢 / 邱孟婷 / 黃柔涵(代理)
    [
      { id: 'g-9-0', name: '王柏詠', isGuest: false, role: '代理' },
      { id: 'g-9-1', name: '林塏秢', isGuest: false },
      { id: 'g-9-2', name: '邱孟婷', isGuest: false },
      { id: 'g-9-3', name: '黃柔涵', isGuest: false, role: '代理' },
    ],
    // 列 10：(空) / 黃子宜(代理) / 陳宜均(代理) / (空)
    [
      null,
      { id: 'g-10-1', name: '黃子宜', isGuest: false, role: '代理' },
      { id: 'g-10-2', name: '陳宜均', isGuest: false, role: '代理' },
      null,
    ],
  ],

  sidebar: [],
};
