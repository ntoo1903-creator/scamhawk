import { redirect } from 'next/navigation';

export default function RootNotFound() {
  // Redirect unknown root paths to the default locale
  redirect('/zh');
}
