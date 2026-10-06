// Constants and types for 長冠軍之星 that are safe on both client and server.

export const STAR_POLL_TITLE = '長冠軍之星';

/** Longest optional praise sentence a voter can attach to a vote. */
export const VOTE_COMMENT_MAX = 100;

export const QUICK_PHRASES = ['引薦品質好', '主題分享精彩', '熱心協助來賓', '準時又投入', '一對一很用心'] as const;

export type PollStatusKey = 'draft' | 'open' | 'closed' | 'archived';
export type PollEligibilityKey = 'public' | 'code_required' | 'signed_in_member';
export type PollResultVisibilityKey = 'hidden' | 'after_closed' | 'live_public' | 'admin_only';

export const POLL_STATUS_LABEL: Record<PollStatusKey, string> = {
  draft: '草稿',
  open: '投票中',
  closed: '已結束',
  archived: '已封存',
};

export const POLL_ELIGIBILITY_LABEL: Record<PollEligibilityKey, string> = {
  public: '免投票碼',
  code_required: '需要投票碼',
  signed_in_member: '限登入會員',
};

export const POLL_RESULT_VISIBILITY_LABEL: Record<PollResultVisibilityKey, string> = {
  after_closed: '結束後公開結果',
  live_public: '投票中就公開票數',
  admin_only: '只有領導團隊看得到結果',
  hidden: '不公開結果',
};

/** Counts characters the way a person would (an emoji or a CJK character is one). */
export function countChars(value: string) {
  return Array.from(value).length;
}

/** Result of the create form: the plain vote code is only available right after creation. */
export type CreatePollState = { ok: boolean; message: string; voteCode?: string | null } | null;
