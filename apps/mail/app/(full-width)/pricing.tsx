import { Link } from 'react-router';

export default function PricingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6fbfa] px-6 text-[#0b2431] dark:bg-[#0b2431] dark:text-white">
      <section className="max-w-xl rounded-3xl border border-[#0b2431]/10 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-[#102f3b]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#397b7b]">
          Yachtbase email workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Plans are managed in Yachtbase</h1>
        <p className="mt-4 text-sm leading-6 opacity-70">
          Your Yachtbase subscription includes unlimited email connections, inbox AI, labeling,
          writing assistance, thread summaries, and priority support on eligible paid plans.
        </p>
        <Link
          to="/dashboard/settings/billing"
          className="mt-6 inline-flex rounded-full bg-[#397b7b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d6667]"
        >
          Open Yachtbase billing
        </Link>
      </section>
    </main>
  );
}
