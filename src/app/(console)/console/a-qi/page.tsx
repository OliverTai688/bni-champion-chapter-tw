import { redirect } from 'next/navigation';

// 阿麒工作室 starts with its groups; the conversation space comes in AQ-003 (PLN-008).
export default function AQiStudioPage() {
  redirect('/console/a-qi/groups');
}
