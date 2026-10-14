// 115/10/15 BNI長冠軍分會座位表
// 領導團隊：主席 古又帆、副主席 黃子宜、秘書 田謦蓉、活動 陳泓睿
// 教育協調：叢晧日（本週臨時代理，程睿紳回到會員座位）
// 資訊組：值日生 吳振綱  音控 林子晏  攝影 韓政諺
// 來賓 6 位（格局同 09/24：來賓正後方為對應執事）
//   賓1 劉昱吟（律師，引薦 古又帆）／ 執事 邱孟婷
//   賓2 童羽薇（行銷&AI，引薦 黃杰）／ 執事 張媁淇（Mecco；叢晧日本週坐主持團）
//   賓3 謝欣禾（室內設計，引薦 黃杰）／ 執事 邱柏瀚（黎士銓本週代理）
//   賓4 巫光平（建設公司，引薦 黃杰）／ 執事 陳志誠
//   賓5 李易霖（資安維護，引薦 洪麗卿）／ 執事 蘇子茵
//   賓6 王彥鈞（旅遊業，引薦 黃杰）／ 執事 馬廷軒
// 代理人（會員在網站登記，排最後一列）：郭子郁（賴鼎文代理）、黎士銓（馮羿嘉代理）
// 葉心琳已離開分會（10/15 起移出座位表與會員名冊）
// 英雄榜：暫無
//
// 會員順序沿用 10/08，只移動來賓、執事、資訊組與代理人

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_1015: Roster = {
  hostTeam: [
    { role: '活動協調', name: '陳泓睿' },
    { role: '財務秘書', name: '田謦蓉' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '叢晧日' },
  ],

  sound: '林子晏',
  duty:  '吳振綱',

  guests: [
    { number: '賓1', guestName: '劉昱吟', hostName: '邱孟婷' },
    { number: '賓2', guestName: '童羽薇', hostName: '張媁淇' },
    { number: '賓3', guestName: '謝欣禾', hostName: '邱柏瀚' },
    { number: '賓4', guestName: '巫光平', hostName: '陳志誠' },
    { number: '賓5', guestName: '李易霖', hostName: '蘇子茵' },
    { number: '賓6', guestName: '王彥鈞', hostName: '馬廷軒' },
  ],

  members: [
    '戴宇星', '程睿紳',
    '黃嘉琪', '陳宜均', '黃佳琪', '林育群',
    '蘇冠霖', '林道元', '洪麗卿', '王致崴',
    '戴嘉慧', '洪宗宏', '梁文齡', '林塏秢',
    '黃杰', '王建豐', '黃柔涵', '林家均',
    '韓政諺', '陳軾', '陳平', '陳俊鳴',
    '王柏詠',
  ],

  proxies: ['郭子郁', '黎士銓'],

  industryChains: [],

  heroes: [],
};

export const LAYOUT_1015: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '陳泓睿', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '田謦蓉', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '叢晧日', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓1 / 賓2 / 賓3 / 吳振綱(值日生)
    [
      { id: 'g-0-0', name: '劉昱吟', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '童羽薇', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '謝欣禾', isGuest: true, guestNumber: '賓3' },
      { id: 'g-0-3', name: '吳振綱', isGuest: false, isDuty: true },
    ],
    // 列 1：邱孟婷(執·賓1) / 張媁淇(執·賓2) / 邱柏瀚(執·賓3) / 林子晏(音控)
    [
      { id: 'g-1-0', name: '邱孟婷', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '張媁淇', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '邱柏瀚', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-1-3', name: '林子晏', isGuest: false, isSound: true },
    ],
    // 列 2：賓4 / 賓5 / 賓6 / 戴宇星
    [
      { id: 'g-2-0', name: '巫光平', isGuest: true, guestNumber: '賓4' },
      { id: 'g-2-1', name: '李易霖', isGuest: true, guestNumber: '賓5' },
      { id: 'g-2-2', name: '王彥鈞', isGuest: true, guestNumber: '賓6' },
      { id: 'g-2-3', name: '戴宇星', isGuest: false },
    ],
    // 列 3：陳志誠(執·賓4) / 蘇子茵(執·賓5) / 馬廷軒(執·賓6) / 程睿紳
    [
      { id: 'g-3-0', name: '陳志誠', isGuest: false, isHost: true, hostFor: '賓4' },
      { id: 'g-3-1', name: '蘇子茵', isGuest: false, isHost: true, hostFor: '賓5' },
      { id: 'g-3-2', name: '馬廷軒', isGuest: false, isHost: true, hostFor: '賓6' },
      { id: 'g-3-3', name: '程睿紳', isGuest: false },
    ],
    // 列 4：黃嘉琪 / 陳宜均 / 黃佳琪 / 林育群
    [
      { id: 'g-4-0', name: '黃嘉琪', isGuest: false },
      { id: 'g-4-1', name: '陳宜均', isGuest: false },
      { id: 'g-4-2', name: '黃佳琪', isGuest: false },
      { id: 'g-4-3', name: '林育群', isGuest: false },
    ],
    // 列 5：蘇冠霖 / 林道元 / 洪麗卿 / 王致崴
    [
      { id: 'g-5-0', name: '蘇冠霖', isGuest: false },
      { id: 'g-5-1', name: '林道元', isGuest: false },
      { id: 'g-5-2', name: '洪麗卿', isGuest: false },
      { id: 'g-5-3', name: '王致崴', isGuest: false },
    ],
    // 列 6：戴嘉慧 / 洪宗宏 / 梁文齡 / 林塏秢
    [
      { id: 'g-6-0', name: '戴嘉慧', isGuest: false },
      { id: 'g-6-1', name: '洪宗宏', isGuest: false },
      { id: 'g-6-2', name: '梁文齡', isGuest: false },
      { id: 'g-6-3', name: '林塏秢', isGuest: false },
    ],
    // 列 7：黃杰 / 王建豐 / 黃柔涵 / 林家均
    [
      { id: 'g-7-0', name: '黃杰', isGuest: false },
      { id: 'g-7-1', name: '王建豐', isGuest: false },
      { id: 'g-7-2', name: '黃柔涵', isGuest: false },
      { id: 'g-7-3', name: '林家均', isGuest: false },
    ],
    // 列 8：韓政諺(攝影) / 陳軾 / 陳平 / 陳俊鳴
    [
      { id: 'g-8-0', name: '韓政諺', isGuest: false, isPhoto: true },
      { id: 'g-8-1', name: '陳軾', isGuest: false },
      { id: 'g-8-2', name: '陳平', isGuest: false },
      { id: 'g-8-3', name: '陳俊鳴', isGuest: false },
    ],
    // 列 9：王柏詠 / 郭子郁(代理) / 黎士銓(代理) / (空)
    [
      { id: 'g-9-0', name: '王柏詠', isGuest: false },
      { id: 'g-9-1', name: '郭子郁', isGuest: false, role: '代理' },
      { id: 'g-9-2', name: '黎士銓', isGuest: false, role: '代理' },
      null,
    ],
  ],

  sidebar: [],
};
