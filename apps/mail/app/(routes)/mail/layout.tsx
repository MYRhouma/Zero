import { HotkeyProviderWrapper } from '@/components/providers/hotkey-provider-wrapper';
import { OnboardingWrapper } from '@/components/onboarding';
import { AppSidebar } from '@/components/ui/app-sidebar';
import { Outlet } from 'react-router';

export default function MailLayout() {
  return (
    <HotkeyProviderWrapper>
      <AppSidebar className="lg:left-[260px] lg:top-16 lg:h-[calc(100dvh-4rem)]" />
      <div className="yachtbase-email-workspace bg-sidebar dark:bg-sidebar w-full">
        <Outlet />
      </div>
      <OnboardingWrapper />
    </HotkeyProviderWrapper>
  );
}
