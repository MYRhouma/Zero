import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAISidebar } from './ui/ai-sidebar';
import { YachtbaseWordmark } from './icons/yachtbase-wordmark';

const GREETING_DELAY_MS = 3000;
const GREETING_DISMISSED_KEY = 'yachtbase-ai-greeting-dismissed';

const greetingDismissed = () => {
  try {
    return sessionStorage.getItem(GREETING_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

const rememberGreetingDismissed = () => {
  try {
    sessionStorage.setItem(GREETING_DISMISSED_KEY, '1');
  } catch {
    // Storage can be unavailable (private mode); the greeting simply shows again.
  }
};

/** Floating Yachtbase AI assistant button, with a short greeting after a few seconds. */
const AIToggleButton = () => {
  const { toggleOpen: toggleAISidebar, open: isSidebarOpen } = useAISidebar();
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    if (isSidebarOpen || greetingDismissed()) return;
    const timer = window.setTimeout(() => setShowGreeting(true), GREETING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isSidebarOpen]);

  if (isSidebarOpen) return null;

  const dismissGreeting = () => {
    setShowGreeting(false);
    rememberGreetingDismissed();
  };

  const open = (event: React.MouseEvent) => {
    event.stopPropagation();
    dismissGreeting();
    toggleAISidebar();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-end gap-3">
      {showGreeting ? (
        <div
          role="status"
          className="animate-in fade-in slide-in-from-right-2 relative mb-1 w-64 rounded-2xl rounded-br-sm border border-[#a7d8d1]/25 bg-[#0b2431] p-3 pr-8 text-left text-white shadow-xl duration-300"
        >
          <button
            type="button"
            aria-label="Hide message"
            onClick={dismissGreeting}
            className="absolute right-2 top-2 rounded-full p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={open} className="block text-left">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <YachtbaseWordmark className="h-[18px]" />
              <span className="rounded-full bg-[#a7d8d1]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#a7d8d1]">
                AI assistant
              </span>
            </span>
            <span className="mt-1.5 block text-xs leading-relaxed text-white/75">
              I can find, summarise, reply to, write and organise anything in your mailbox. Just ask!
            </span>
          </button>
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Open Yachtbase AI assistant"
        title="Yachtbase AI assistant"
        onClick={open}
        className="group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0b2431] shadow-lg ring-1 ring-[#a7d8d1]/30 transition-all hover:scale-105 hover:bg-[#173f4e] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a7d8d1]"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-[#a7d8d1]/20 [animation-duration:2.5s]" aria-hidden="true" />
        <Sparkles className="relative h-6 w-6 text-[#a7d8d1] transition-transform group-hover:rotate-12" aria-hidden="true" />
      </button>
    </div>
  );
};

export default AIToggleButton;
