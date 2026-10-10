import { redirect } from 'next/navigation';

export default function RedirectPage() {
  redirect('/dashboard/patent-drafter/review/feedback-logs');
}
