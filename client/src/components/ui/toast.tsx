import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    ({ title, description, variant = 'info' }) => {
      counter += 1;
      const id = counter;
      setItems((current) => [...current.slice(-3), { id, title, description, variant }]);
      window.setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error' }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-4 sm:items-end sm:px-6 sm:pb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border bg-white p-4 shadow-pop',
              item.variant === 'success' && 'border-success/20',
              item.variant === 'error' && 'border-danger/20',
              item.variant === 'info' && 'border-border',
            )}
            role="status"
          >
            {item.variant === 'success' && (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            )}
            {item.variant === 'error' && (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            )}
            {item.variant === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Yopish"
              onClick={() => dismiss(item.id)}
              className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast ToastProvider ichida ishlatilishi kerak.');
  return context;
}
