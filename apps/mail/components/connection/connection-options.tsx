import { GmailColor } from '../icons/icons';

/** Zero's provider chooser, separated from its router, billing and login. */
export function ConnectionOptions({ providers, pending, onConnect }: {
  providers: { id: string; name: string }[];
  pending: string | null;
  onConnect: (provider: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {providers.map((provider) => (
        <button key={provider.id} type="button" disabled={pending !== null}
          onClick={() => onConnect(provider.id)}
          className="flex min-h-24 min-w-40 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-background px-6 py-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60">
          {provider.id === 'google' && <span aria-hidden="true"><GmailColor className="h-5 w-6" /></span>}
          <span>{pending === provider.id ? 'Connecting…' : provider.name}</span>
        </button>
      ))}
    </div>
  );
}
