import { HotkeyProviderWrapper } from '@/components/providers/hotkey-provider-wrapper';
import { AppSidebar } from '@/components/ui/app-sidebar';
import { Outlet } from 'react-router';

export default function MailLayout() {
  return (
    <HotkeyProviderWrapper>
      <AppSidebar className="h-dvh" />
      <div className="yachtbase-email-workspace bg-sidebar dark:bg-sidebar w-full">
        <Outlet />
      </div>
    </HotkeyProviderWrapper>
  );
}
