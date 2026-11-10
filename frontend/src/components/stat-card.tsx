import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const tones = {
  blue: 'from-primary-500/25 to-primary-500/5 text-primary-700 ring-primary-500/20',
  green: 'from-emerald-500/25 to-emerald-500/5 text-emerald-700 ring-emerald-500/20',
  amber: 'from-amber-500/25 to-amber-500/5 text-amber-700 ring-amber-500/20',
  slate: 'from-slate-500/20 to-slate-500/5 text-slate-600 ring-slate-400/20',
  violet: 'from-violet-500/25 to-violet-500/5 text-violet-700 ring-violet-500/20',
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'blue',
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-glass-lg sm:p-6',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-gradient-to-br from-primary/15 to-violet-400/10 blur-2xl transition duration-500 group-hover:scale-110"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold leading-none text-foreground sm:text-[28px]">
            {value}
          </p>
          {hint && <p className="mt-2.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-gradient-to-br shadow-glass-sm ring-1 transition duration-300 group-hover:scale-105',
            tones[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
