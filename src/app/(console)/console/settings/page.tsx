import { redirect } from 'next/navigation';

// /console/settings has no content of its own; the first tab is the landing page.
export default function SettingsIndexPage() {
  redirect('/console/settings/roles');
}
