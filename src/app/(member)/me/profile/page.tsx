import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, UserRoundCog } from 'lucide-react';
import { KeepValuesForm } from '@/components/tbx/members/keep-values-form';
import { Card, PageHeader } from '@/components/tbx/ui';
import { OWN_PROFILE_TEXT_LIMIT, getOwnProfile } from '@/server/tbx/member-admin';
import { getViewer } from '@/server/tbx/viewer';
import { updateMyProfileAction } from './actions';

const LOGIN = '/login?next=/me/profile';

export default async function MyProfilePage() {
  // The layout redirects too, but it renders alongside this page, so check again before reading the profile.
  const viewer = await getViewer();
  if (!viewer.member) redirect(LOGIN);
  const profile = await getOwnProfile(viewer.member.id);
  if (!profile) redirect(LOGIN);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/me/scorecard"
        className="inline-flex min-h-[44px] items-center gap-1.5 self-start text-sm font-semibold text-tb-muted no-underline hover:text-tb-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        回到我的燈號
      </Link>

      <PageHeader
        eyebrow="我的"
        title="我的商務檔案"
        description="寫下你做什麼、想認識誰，夥伴才知道怎麼幫你引薦。電話與 Email 不會出現在公開頁面。"
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
            <dt className="text-xs font-semibold text-tb-faint">姓名</dt>
            <dt className="text-xs font-semibold text-tb-faint">行政分組</dt>
            <dd className="text-base font-bold">{profile.displayName}</dd>
            <dd className="text-base font-bold">{profile.adminGroup || '未分組'}</dd>
          </dl>
          <Link href="/login" className="tb-btn min-h-[44px]">
            <UserRoundCog className="h-4 w-4" aria-hidden="true" />
            切換身份
          </Link>
        </div>
        <p className="mt-3 text-xs text-tb-faint">姓名與行政分組由領導團隊維護，需要更正請告訴秘書財務。</p>
      </Card>

      <Card title="商務資料">
        <KeepValuesForm
          action={updateMyProfileAction}
          className="flex flex-col gap-4"
          submitLabel="儲存我的商務檔案"
          submitClassName="tb-btn-lg"
        >
          <label className="tb-label" htmlFor="profile-industry">
            產業
            <input
              id="profile-industry"
              name="industry"
              className="tb-input min-h-[44px]"
              defaultValue={profile.industry ?? ''}
              maxLength={60}
              placeholder="例如 室內設計"
            />
          </label>
          <label className="tb-label" htmlFor="profile-company">
            公司
            <input
              id="profile-company"
              name="company"
              className="tb-input min-h-[44px]"
              defaultValue={profile.company ?? ''}
              maxLength={80}
              autoComplete="organization"
            />
          </label>
          <label className="tb-label" htmlFor="profile-intro">
            自我介紹（最多 {OWN_PROFILE_TEXT_LIMIT} 字）
            <textarea
              id="profile-intro"
              name="intro"
              className="tb-textarea"
              rows={5}
              defaultValue={profile.intro ?? ''}
              maxLength={OWN_PROFILE_TEXT_LIMIT}
              placeholder="你提供什麼服務、有什麼特色"
            />
          </label>
          <label className="tb-label" htmlFor="profile-target">
            目標客戶（最多 {OWN_PROFILE_TEXT_LIMIT} 字）
            <textarea
              id="profile-target"
              name="targetCustomers"
              className="tb-textarea"
              rows={5}
              defaultValue={profile.targetCustomers ?? ''}
              maxLength={OWN_PROFILE_TEXT_LIMIT}
              placeholder="你想被引薦給誰，例如 剛買房的新婚夫妻"
            />
          </label>
          <label className="tb-label" htmlFor="profile-phone">
            電話
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              className="tb-input min-h-[44px]"
              defaultValue={profile.phone ?? ''}
              maxLength={30}
              autoComplete="tel"
            />
          </label>
          <label className="tb-label" htmlFor="profile-email">
            Email
            <input
              id="profile-email"
              name="email"
              type="email"
              className="tb-input min-h-[44px]"
              defaultValue={profile.email ?? ''}
              maxLength={120}
              autoComplete="email"
            />
          </label>
        </KeepValuesForm>
      </Card>
    </div>
  );
}
