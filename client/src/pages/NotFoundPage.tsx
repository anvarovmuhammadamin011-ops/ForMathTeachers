import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Brand />
        </div>
        <div className="mt-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-soft text-primary">
            <Compass className="h-8 w-8" />
          </div>
        </div>
        <p className="mt-5 font-display text-5xl font-extrabold tracking-tight text-foreground">
          404
        </p>
        <h1 className="mt-2 font-display text-xl font-bold text-foreground">
          Sahifa topilmadi
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Siz izlagan sahifa mavjud emas yoki manzil o‘zgargan bo‘lishi mumkin.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Bosh sahifaga qaytish
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/kirish">Tizimga kirish</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
