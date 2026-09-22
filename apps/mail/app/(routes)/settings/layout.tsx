import { SettingsLayoutContent } from '@/components/ui/settings-content';
import { Outlet } from 'react-router';
import { getYachtbaseSession, redirectToYachtbaseLogin } from '@/lib/yachtbase-session';
import type { Route } from './+types/layout';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const session = await getYachtbaseSession(request.headers);

  if (!session) return redirectToYachtbaseLogin(request);

  
  return null;
}

export default function SettingsLayout() {
  return (
    <SettingsLayoutContent>
      <Outlet />
    </SettingsLayoutContent>
  );
}
