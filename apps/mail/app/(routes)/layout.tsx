import { HotkeyProviderWrapper } from '@/components/providers/hotkey-provider-wrapper';
import { CommandPaletteProvider } from '@/components/context/command-palette-context';
import { YachtbaseShell } from '@/components/yachtbase/yachtbase-shell';

import { Outlet } from 'react-router';


export default function Layout() {
  return (
    <YachtbaseShell>
      <CommandPaletteProvider>
        <HotkeyProviderWrapper>
          <div className="relative flex max-h-screen w-full overflow-hidden">
            <Outlet />
          </div>
        </HotkeyProviderWrapper>
      </CommandPaletteProvider>
    </YachtbaseShell>
  );
}
