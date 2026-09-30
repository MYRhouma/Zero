import { cn } from '@/lib/utils';

/**
 * The Yachtbase wordmark, drawn inline so it never depends on a public file.
 * The text uses the current text colour; the dot keeps the brand accent.
 */
export function YachtbaseWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 330 64"
      role="img"
      aria-label="Yachtbase"
      className={cn('h-4 w-auto', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="50"
        fill="currentColor"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="52"
        fontWeight="800"
        letterSpacing="-4.5"
      >
        yachtbase<tspan fill="#71b9b1">.</tspan>
      </text>
    </svg>
  );
}
