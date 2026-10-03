import { redirect } from 'next/navigation';

export default function AdminScoresPage() {
  redirect('/admin/tabulation?tab=scores');
}
