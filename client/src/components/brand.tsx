import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/30',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" aria-hidden>
        <path
          d="M4 9.5c1.6 0 2.4-4.5 4-4.5.9 0 1.4 1.3 2.1 3.4.6 1.7 1 2.9 1.9 2.9.9 0 1.3-1 2-1 .7 0 1.1.5 1.1 1 0 .6-.5 1-1.1 1-1.5 0-2.1-1.9-2.8-3.9-.6-1.6-1-2.4-1.5-2.4-.7 0-1.1 2.4-1.7 4.8-.8 3-1.6 4.9-3 4.9-.7 0-1.2-.4-1.2-1 0-.7.5-1.2 1.2-1.2Z"
          fill="currentColor"
        />
        <path d="M16.5 8.5 21 15m0-6.5L16.5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-extrabold tracking-tight text-foreground">
            MathTest <span className="text-primary">AI</span>
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Matematika platformasi
          </span>
        </span>
      )}
    </Link>
  );
}
