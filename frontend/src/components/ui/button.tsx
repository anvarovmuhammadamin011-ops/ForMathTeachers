import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 active:scale-[0.985]',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-primary-foreground shadow-sm shadow-primary/30 hover:shadow-lg hover:shadow-primary/30 hover:brightness-105',
        secondary:
          'border border-white/60 bg-white/70 text-primary-700 shadow-glass-sm backdrop-blur-md hover:bg-white/90 supports-[backdrop-filter]:bg-white/50 supports-[backdrop-filter]:hover:bg-white/75',
        outline:
          'border border-white/70 bg-white/60 text-foreground shadow-glass-sm backdrop-blur-md hover:border-primary/30 hover:bg-white/90 supports-[backdrop-filter]:bg-white/40 supports-[backdrop-filter]:hover:bg-white/70',
        ghost: 'text-muted-foreground hover:bg-white/60 hover:text-foreground hover:backdrop-blur-md',
        subtle:
          'border border-white/50 bg-white/50 text-foreground backdrop-blur-md hover:bg-white/80',
        danger:
          'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-sm shadow-danger/25 hover:shadow-lg hover:shadow-danger/25 hover:brightness-105',
        success:
          'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-sm shadow-success/25 hover:shadow-lg hover:shadow-success/25 hover:brightness-105',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
