import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary-100/80 bg-primary-50/85 text-primary-700 backdrop-blur-sm',
        outline:
          'border-white/70 bg-white/70 text-muted-foreground backdrop-blur-md supports-[backdrop-filter]:bg-white/45',
        success: 'border-success/15 bg-success-soft/85 text-success-foreground backdrop-blur-sm',
        warning: 'border-warning/15 bg-warning-soft/85 text-warning-foreground backdrop-blur-sm',
        danger: 'border-danger/15 bg-danger-soft/85 text-danger-foreground backdrop-blur-sm',
        neutral: 'border-white/60 bg-white/55 text-slate-600 backdrop-blur-sm',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
