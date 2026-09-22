import { redirect } from 'react-router';
import type { Route } from './+types/page';
import { getYachtbaseSession, yachtbaseLoginUrl } from '@/lib/yachtbase-session';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const session = await getYachtbaseSession(request.headers);
  if (session?.user.id) throw redirect('/dashboard/email/mail/inbox');
  throw redirect(yachtbaseLoginUrl(request));
}

export default function Home() {
  return null;
}
