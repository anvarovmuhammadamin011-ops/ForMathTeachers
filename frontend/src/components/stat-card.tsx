import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const tones = {
  blue: 'bg-primary-50 text-primary-700',
  green: 'bg-success-soft text-success-foreground',
  amber: 'bg-warning-soft text-warning-foreground',
  slate: 'bg-muted text-slate-600',
  violet: 'bg-violet-50 text-violet-700',
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
    <Card className={cn('group p-5 transition hover:-translate-y-0.5 hover:shadow-pop sm:p-6', className)}>
      <div className="flex items-start justify-between gap-3">
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
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105',
            tones[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
