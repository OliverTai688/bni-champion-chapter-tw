import { taipeiDateKey } from '@/lib/tbx/labels';

/** Plain values for the member form. Dates travel as YYYY-MM-DD so the dialog props stay serialisable. */
export interface MemberFormValues {
  id: string;
  displayName: string;
  adminGroup: string;
  roles: string[];
  industry: string;
  company: string;
  phone: string;
  email: string;
  intro: string;
  targetCustomers: string;
  aliases: string[];
  joinedAt: string;
  isActive: boolean;
  note: string;
}

/** Leadership pages only: the result includes phone, email and the private note. */
export function toMemberFormValues(member: {
  id: string;
  displayName: string;
  adminGroup: string | null;
  roles: string[];
  industry: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  intro: string | null;
  targetCustomers: string | null;
  aliases: string[];
  joinedAt: Date | null;
  isActive: boolean;
  note: string | null;
}): MemberFormValues {
  return {
    id: member.id,
    displayName: member.displayName,
    adminGroup: member.adminGroup ?? '',
    roles: member.roles ?? [],
    industry: member.industry ?? '',
    company: member.company ?? '',
    phone: member.phone ?? '',
    email: member.email ?? '',
    intro: member.intro ?? '',
    targetCustomers: member.targetCustomers ?? '',
    aliases: member.aliases ?? [],
    joinedAt: member.joinedAt ? taipeiDateKey(member.joinedAt) : '',
    isActive: member.isActive,
    note: member.note ?? '',
  };
}
