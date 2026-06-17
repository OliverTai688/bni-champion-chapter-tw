import { IndustryChain, IndustryChainGroup } from '@/types/seating';

// 來源：BNI長冠軍分會產業服務鍊20260228 (第1.1版)
export const DEFAULT_INDUSTRY_CHAINS: IndustryChain[] = [
  // A 組 (10)
  {
    id: 'A1',
    group: 'A',
    name: '品牌主服務鍊',
    members: ['林家均', '陳宜均', '張媁淇'],
    targetCustomers: '各品牌公司負責人(企業發展)',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'A2',
    group: 'A',
    name: '媒體影像服務鍊',
    members: ['叢晧日', '張媁淇', '王家玉', '劉庭羽', '黃柔涵'],
    targetCustomers: '各品牌公司行銷窗口',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'A3',
    group: 'A',
    name: '職人服務鍊',
    members: ['陳宜均', '黃柔涵'],
    targetCustomers: '師字輩及專業人士(醫師,廚師,主管,主播)',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'A4',
    group: 'A',
    name: '社團及協會服務鍊',
    members: ['叢晧日', '葉心琳', '邱欣怡', '劉庭羽'],
    targetCustomers: '各大社團及協會',
    gap: '請各組提出',
    finalized: false,
  },

  // B 組 (12)
  {
    id: 'B1',
    group: 'B',
    name: '餐飲業服務鍊',
    members: ['邱柏瀚', '黃子宜', '黎士銓', '王柏詠', '郭子郁'],
    targetCustomers: '各大餐飲業',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'B2',
    group: 'B',
    name: '室內裝修設計業服務鍊',
    members: ['黃子宜', '田謦蓉', '洪宗宏', '王家玉', '王建豐'],
    targetCustomers: '室內裝修設計公司(商空優先)',
    gap: '油漆,水電,空調,泥做',
    finalized: false,
  },
  {
    id: 'B3',
    group: 'B',
    name: '廠辦服務鍊',
    members: ['馬廷軒', '黃子宜'],
    targetCustomers: '工廠及辦公大樓(廠務,高階主管,總務)',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'B4',
    group: 'B',
    name: '營建業服務鍊',
    members: ['王致崴', '戴嘉慧'],
    targetCustomers: '公共工程建築師/營造廠',
    gap: '請各組提出',
    finalized: false,
  },

  // C 組 (9)
  {
    id: 'C1',
    group: 'C',
    name: '大專學校服務鍊',
    members: ['蘇子茵', '戴宇星', '陳志誠'],
    targetCustomers: '各大學或高中(總務,教務,博士)',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'C2',
    group: 'C',
    name: '補習班業服務鍊',
    members: ['蘇子茵', '林道元', '陳俊鳴'],
    targetCustomers: '各大補習班',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'C3',
    group: 'C',
    name: '家庭主婦服務鍊',
    members: ['林育群', '吳振綱', '梁文齡', '林道元'],
    targetCustomers: '媽媽或女性高階主管',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'C4',
    group: 'C',
    name: '團主服務鍊',
    members: ['黃佳琪', '陳維慶', '葉心琳'],
    targetCustomers: '各團爸團媽',
    gap: '請各組提出',
    finalized: false,
  },

  // D 組 (14)
  {
    id: 'D1',
    group: 'D',
    name: '高資產服務鍊',
    members: ['古又帆', '程睿紳', '陳泓睿', '邱孟婷', '蘇冠霖', '林育群', '黃嘉琪'],
    targetCustomers: '年薪300萬以上',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'D2',
    group: 'D',
    name: '醫美及診所服務鍊',
    members: ['古又帆', '陳志誠', '戴嘉慧', '林塏秢', '黃嘉琪'],
    targetCustomers: '醫生群(牙醫 各醫院 診所)',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'D3',
    group: 'D',
    name: '金融業服務鍊',
    members: ['葉心琳', '邱欣怡', '邱孟婷', '蘇冠霖'],
    targetCustomers: '各大銀行 證券',
    gap: '請各組提出',
    finalized: false,
  },
  {
    id: 'D4',
    group: 'D',
    name: '保險業服務鍊',
    members: ['程睿紳', '梁文齡', '陳俊鳴'],
    targetCustomers: '各大保險業務員',
    gap: '請各組提出',
    finalized: false,
  },
];

export const INDUSTRY_GROUP_COLORS: Record<IndustryChainGroup, {
  badge: string;
  ring: string;
  text: string;
  panel: string;
}> = {
  A: {
    badge: 'bg-rose-500 text-white',
    ring: 'ring-rose-400/40',
    text: 'text-rose-600 dark:text-rose-300',
    panel: 'bg-rose-500/5 border-rose-500/20',
  },
  B: {
    badge: 'bg-amber-500 text-white',
    ring: 'ring-amber-400/40',
    text: 'text-amber-600 dark:text-amber-300',
    panel: 'bg-amber-500/5 border-amber-500/20',
  },
  C: {
    badge: 'bg-emerald-500 text-white',
    ring: 'ring-emerald-400/40',
    text: 'text-emerald-600 dark:text-emerald-300',
    panel: 'bg-emerald-500/5 border-emerald-500/20',
  },
  D: {
    badge: 'bg-sky-500 text-white',
    ring: 'ring-sky-400/40',
    text: 'text-sky-600 dark:text-sky-300',
    panel: 'bg-sky-500/5 border-sky-500/20',
  },
};

// 由產業鏈陣列建出 "姓名 → 產業鏈代號清單" 的索引，方便在座位卡片上掛標籤。
export function buildPersonChainIndex(chains: IndustryChain[]): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const chain of chains) {
    for (const name of chain.members) {
      const key = name.trim();
      if (!key) continue;
      const arr = idx.get(key) ?? [];
      arr.push(chain.id);
      idx.set(key, arr);
    }
  }
  return idx;
}
