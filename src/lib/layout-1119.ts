// 115/11/19 BNI長冠軍分會座位表
// 領導團隊：主席 古又帆、副主席 黃子宜、活動 陳泓睿、教育協調 黎士銓
//          財務秘書 林育群（代理財務秘書：田謦蓉本週請代理，曾任秘書的戴嘉慧也代理）
// 資訊組：值日生 吳振綱  音控 郭子郁  攝影 林道元（中間走道 二排7）
// 來賓 5 位（人才接龍；來賓正後方為對應執事）
//   賓1 李茜芸（花藝師，引薦 古又帆，關係 3 / 意願 3）／ 執事 蘇子茵
//   賓2 郭晟修（五金衛浴，引薦 陳俊鳴，關係 3 / 意願 2）／ 執事 陳志誠
//   賓3 董隽綨（生技，引薦 黃子宜，關係 3 / 意願 3）／ 執事 叢晧日（叢導）
//   賓4 林葳（中日畫家，引薦 程睿紳，關係 4 / 意願 2）／ 執事 張媁淇（Mecco）
//   賓5 王耀德（新加坡會計師 Malcolm Heng SG PAC，引薦 古又帆，新加坡分會參訪）／ 執事 邱柏瀚（jerry）
// 引薦人 陳俊鳴 坐三排1、程睿紳 坐二排3，分別與 賓2、賓4 同一排長椅相鄰；古又帆、黃子宜在主持團
// 導生 譚旭良 坐在 馬廷軒 旁邊（一排 5 / 6）
// 新會員 陳軾 坐在導師 王柏詠 正後方；陳平 坐在導師 蘇冠霖 正後方
// Mina 陳宜均固定 音控正後方（g-2-3）
// 代理人（網站登記）：戴嘉慧（謝堯誠）、林塏秢（邱凡華）、田謦蓉（杜文魁）、黃杰（梁凱傑）、黃柔涵（陳冠蓉）
// 英雄榜：謦蓉 👉 泓睿 👉 睿紳 👉 子郁 ／ 柏瀚 👉 育群 👉 黃杰 👉 子晏
//
// 其他會員順序沿用 11/12
// 物理場地：欄0+1 = 第一排長桌（面對面），欄2+3 = 第二排長桌（面對面）

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_1119: Roster = {
  hostTeam: [
    { role: '活動協調', name: '陳泓睿' },
    { role: '財務秘書', name: '林育群' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '黎士銓' },
  ],

  sound: '郭子郁',
  duty:  '吳振綱',

  guests: [
    { number: '賓1', guestName: '李茜芸', hostName: '蘇子茵' },
    { number: '賓2', guestName: '郭晟修', hostName: '陳志誠' },
    { number: '賓3', guestName: '董隽綨', hostName: '叢晧日' },
    { number: '賓4', guestName: '林葳',   hostName: '張媁淇' },
    { number: '賓5', guestName: '王耀德', hostName: '邱柏瀚' },
  ],

  members: [
    '程睿紳', '陳俊鳴',
    '王柏詠', '陳軾', '黃佳琪', '林家均',
    '馬廷軒', '譚旭良', '林子晏', '蘇冠霖', '洪麗卿',
    '戴宇星', '林道元', '陳平', '王致崴',
    '王建豐', '洪宗宏', '梁文齡', '黃嘉琪',
    '邱孟婷', '韓政諺',
    '陳宜均',
  ],

  proxies: ['戴嘉慧', '林塏秢', '田謦蓉', '黃杰', '黃柔涵'],

  industryChains: [],

  heroes: ['田謦蓉', '陳泓睿', '程睿紳', '郭子郁', '邱柏瀚', '林育群', '黃杰', '林子晏'],
};

export const LAYOUT_1119: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '陳泓睿', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '林育群', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '黎士銓', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓1 / 賓3 / 陳俊鳴(引薦·賓2) / 吳振綱(值日生)
    [
      { id: 'g-0-0', name: '李茜芸', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '董隽綨', isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-2', name: '陳俊鳴', isGuest: false },
      { id: 'g-0-3', name: '吳振綱', isGuest: false, isDuty: true },
    ],
    // 列 1：蘇子茵(執·賓1) / 叢晧日(執·賓3) / 賓2(緊鄰引薦人) / 郭子郁(音控)
    [
      { id: 'g-1-0', name: '蘇子茵', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '叢晧日', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-2', name: '郭晟修', isGuest: true, guestNumber: '賓2' },
      { id: 'g-1-3', name: '郭子郁', isGuest: false, isSound: true },
    ],
    // 列 2：賓5 / 程睿紳(引薦·賓4) / 陳志誠(執·賓2) / 陳宜均(Mina 固定，音控正後方)
    [
      { id: 'g-2-0', name: '王耀德', isGuest: true, guestNumber: '賓5' },
      { id: 'g-2-1', name: '程睿紳', isGuest: false },
      { id: 'g-2-2', name: '陳志誠', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-2-3', name: '陳宜均', isGuest: false },
    ],
    // 列 3：邱柏瀚(執·賓5) / 賓4(緊鄰引薦人) / 王柏詠 / 黃佳琪
    [
      { id: 'g-3-0', name: '邱柏瀚', isGuest: false, isHost: true, hostFor: '賓5' },
      { id: 'g-3-1', name: '林葳', isGuest: true, guestNumber: '賓4' },
      { id: 'g-3-2', name: '王柏詠', isGuest: false },
      { id: 'g-3-3', name: '黃佳琪', isGuest: false },
    ],
    // 列 4：馬廷軒 / 張媁淇(執·賓4) / 陳軾(王柏詠正後方) / 林家均
    [
      { id: 'g-4-0', name: '馬廷軒', isGuest: false },
      { id: 'g-4-1', name: '張媁淇', isGuest: false, isHost: true, hostFor: '賓4' },
      { id: 'g-4-2', name: '陳軾', isGuest: false },
      { id: 'g-4-3', name: '林家均', isGuest: false },
    ],
    // 列 5：譚旭良(導生，馬廷軒旁邊) / 林子晏 / 蘇冠霖 / 洪麗卿
    [
      { id: 'g-5-0', name: '譚旭良', isGuest: false },
      { id: 'g-5-1', name: '林子晏', isGuest: false },
      { id: 'g-5-2', name: '蘇冠霖', isGuest: false },
      { id: 'g-5-3', name: '洪麗卿', isGuest: false },
    ],
    // 列 6：戴宇星 / 林道元(攝影，中間走道靠後) / 陳平(蘇冠霖正後方) / 王致崴
    [
      { id: 'g-6-0', name: '戴宇星', isGuest: false },
      { id: 'g-6-1', name: '林道元', isGuest: false, isPhoto: true },
      { id: 'g-6-2', name: '陳平', isGuest: false },
      { id: 'g-6-3', name: '王致崴', isGuest: false },
    ],
    // 列 7：王建豐 / 洪宗宏 / 梁文齡 / 黃嘉琪
    [
      { id: 'g-7-0', name: '王建豐', isGuest: false },
      { id: 'g-7-1', name: '洪宗宏', isGuest: false },
      { id: 'g-7-2', name: '梁文齡', isGuest: false },
      { id: 'g-7-3', name: '黃嘉琪', isGuest: false },
    ],
    // 列 8：邱孟婷 / 韓政諺 / 戴嘉慧(代理) / 林塏秢(代理)
    [
      { id: 'g-8-0', name: '邱孟婷', isGuest: false },
      { id: 'g-8-1', name: '韓政諺', isGuest: false },
      { id: 'g-8-2', name: '戴嘉慧', isGuest: false, role: '代理' },
      { id: 'g-8-3', name: '林塏秢', isGuest: false, role: '代理' },
    ],
    // 列 9：田謦蓉(代理) / 黃杰(代理) / 黃柔涵(代理) / (空)
    [
      { id: 'g-9-0', name: '田謦蓉', isGuest: false, role: '代理' },
      { id: 'g-9-1', name: '黃杰', isGuest: false, role: '代理' },
      { id: 'g-9-2', name: '黃柔涵', isGuest: false, role: '代理' },
      null,
    ],
  ],

  sidebar: [],
};
