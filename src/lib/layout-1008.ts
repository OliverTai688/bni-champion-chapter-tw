// 115/10/08 BNI長冠軍分會座位表
// 封閉會議：只有分會成員，無來賓、無執事配對、無代理人
// 領導團隊同 10/01：主席 古又帆、副主席 黃子宜、秘書 田謦蓉、活動 陳泓睿、教育 程睿紳
// 資訊組：值日生與音控由 戴宇星 一人負責（坐值日生基準位置 列 0・欄 3）
// 英雄榜：暫無
//
// 版面同 10/01：主持團 5 席 + 4 欄主座位區，由前往後排滿，最後一列留 2 個空位
// 其餘 33 位會員隨機入座（mulberry32 + Fisher-Yates，seed 1057246655）

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_1008: Roster = {
  hostTeam: [
    { role: '活動協調', name: '陳泓睿' },
    { role: '財務秘書', name: '田謦蓉' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '程睿紳' },
  ],

  sound: '戴宇星',
  duty:  '戴宇星',

  guests: [],

  members: [
    '黃嘉琪', '陳宜均', '黃佳琪',
    '林育群', '叢晧日', '蘇冠霖', '黎士銓',
    '林道元', '邱柏瀚', '洪麗卿', '王致崴',
    '吳振綱', '張媁淇', '戴嘉慧', '馬廷軒',
    '洪宗宏', '陳志誠', '梁文齡', '林塏秢',
    '黃杰', '邱孟婷', '王建豐', '黃柔涵',
    '林家均', '韓政諺', '蘇子茵', '林子晏',
    '陳軾', '陳平', '陳俊鳴', '郭子郁',
    '葉心琳', '王柏詠',
  ],

  proxies: [],

  industryChains: [],

  heroes: [],
};

export const LAYOUT_1008: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '陳泓睿', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '田謦蓉', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '程睿紳', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：黃嘉琪 / 陳宜均 / 黃佳琪 / 戴宇星(值日＋音控)
    [
      { id: 'g-0-0', name: '黃嘉琪', isGuest: false },
      { id: 'g-0-1', name: '陳宜均', isGuest: false },
      { id: 'g-0-2', name: '黃佳琪', isGuest: false },
      { id: 'g-0-3', name: '戴宇星', isGuest: false, isDuty: true, isSound: true, role: '值日・音控' },
    ],
    // 列 1：林育群 / 叢晧日 / 蘇冠霖 / 黎士銓
    [
      { id: 'g-1-0', name: '林育群', isGuest: false },
      { id: 'g-1-1', name: '叢晧日', isGuest: false },
      { id: 'g-1-2', name: '蘇冠霖', isGuest: false },
      { id: 'g-1-3', name: '黎士銓', isGuest: false },
    ],
    // 列 2：林道元 / 邱柏瀚 / 洪麗卿 / 王致崴
    [
      { id: 'g-2-0', name: '林道元', isGuest: false },
      { id: 'g-2-1', name: '邱柏瀚', isGuest: false },
      { id: 'g-2-2', name: '洪麗卿', isGuest: false },
      { id: 'g-2-3', name: '王致崴', isGuest: false },
    ],
    // 列 3：吳振綱 / 張媁淇 / 戴嘉慧 / 馬廷軒
    [
      { id: 'g-3-0', name: '吳振綱', isGuest: false },
      { id: 'g-3-1', name: '張媁淇', isGuest: false },
      { id: 'g-3-2', name: '戴嘉慧', isGuest: false },
      { id: 'g-3-3', name: '馬廷軒', isGuest: false },
    ],
    // 列 4：洪宗宏 / 陳志誠 / 梁文齡 / 林塏秢
    [
      { id: 'g-4-0', name: '洪宗宏', isGuest: false },
      { id: 'g-4-1', name: '陳志誠', isGuest: false },
      { id: 'g-4-2', name: '梁文齡', isGuest: false },
      { id: 'g-4-3', name: '林塏秢', isGuest: false },
    ],
    // 列 5：黃杰 / 邱孟婷 / 王建豐 / 黃柔涵
    [
      { id: 'g-5-0', name: '黃杰', isGuest: false },
      { id: 'g-5-1', name: '邱孟婷', isGuest: false },
      { id: 'g-5-2', name: '王建豐', isGuest: false },
      { id: 'g-5-3', name: '黃柔涵', isGuest: false },
    ],
    // 列 6：林家均 / 韓政諺 / 蘇子茵 / 林子晏
    [
      { id: 'g-6-0', name: '林家均', isGuest: false },
      { id: 'g-6-1', name: '韓政諺', isGuest: false },
      { id: 'g-6-2', name: '蘇子茵', isGuest: false },
      { id: 'g-6-3', name: '林子晏', isGuest: false },
    ],
    // 列 7：陳軾 / 陳平 / 陳俊鳴 / 郭子郁
    [
      { id: 'g-7-0', name: '陳軾', isGuest: false },
      { id: 'g-7-1', name: '陳平', isGuest: false },
      { id: 'g-7-2', name: '陳俊鳴', isGuest: false },
      { id: 'g-7-3', name: '郭子郁', isGuest: false },
    ],
    // 列 8：葉心琳 / 王柏詠 / (空) / (空)
    [
      { id: 'g-8-0', name: '葉心琳', isGuest: false },
      { id: 'g-8-1', name: '王柏詠', isGuest: false },
      null,
      null,
    ],
  ],

  sidebar: [],
};
