import { NavLink } from '@/components/tbx/client';

const TABS = [
  { href: '/console/settings/roles', label: '職位與任期' },
  { href: '/console/settings/audit', label: '操作紀錄' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <nav className="tb-tabs" aria-label="設定">
        {TABS.map((tab) => (
          <NavLink key={tab.href} href={tab.href} className="tb-tab">
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
