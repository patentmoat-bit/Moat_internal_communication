import { redirect } from 'next/navigation';

export default function RedirectPage() {
  redirect('/dashboard/patent-drafter/reports/drafting-metrics');
}
