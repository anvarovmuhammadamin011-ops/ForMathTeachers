import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, CheckCircle2, FileText, ShieldCheck, Sparkles } from 'lucide-react';
import { LogoMark } from '@/components/brand';

const features = [
  {
    icon: FileText,
    title: 'PDF dan avtomatik ajratish',
    text: 'Matnli va skanerlangan PDF, formulalar, kasrlar va diagrammalar.',
  },
  {
    icon: BrainCircuit,
    title: 'AI yechadi va tekshiradi',
    text: 'Har bir masala yechiladi, javob mustaqil usulda qayta tekshiriladi.',
  },
  {
    icon: ShieldCheck,
    title: 'O‘qituvchi nazorati',
    text: 'Savollar tasdiqlangandan keyingina o‘quvchilarga ko‘rinadi.',
  },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#0B1739] p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-28 top-10 h-80 w-80 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              maskImage: 'radial-gradient(ellipse at 40% 30%, black, transparent 75%)',
            }}
          />
        </div>

        <div className="relative flex items-center gap-3">
          <LogoMark className="h-11 w-11 bg-white/10 shadow-none ring-1 ring-white/20" />
          <div>
            <p className="font-display text-lg font-extrabold tracking-tight">
              MathTest <span className="text-blue-300">AI</span>
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-blue-200/70">
              Matematika platformasi
            </p>
          </div>
        </div>

        <div className="relative mt-auto max-w-xl py-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-blue-100">
            <Sparkles className="h-3.5 w-3.5" />
            AI yordamida matematika testlari
          </span>
          <h1 className="mt-5 text-balance font-display text-4xl font-extrabold leading-[1.12] xl:text-[44px]">
            PDF dan tayyor testgacha — bir necha daqiqada.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-blue-100/80 sm:text-base">
            Savollarni yuklang. AI ularni o‘qiydi, yechadi, javoblarni tekshiradi va
            A/B/C/D testga aylantiradi. Siz faqat tasdiqlaysiz.
          </p>

          <div className="mt-8 grid gap-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-200">
                  <feature.icon className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-blue-100/70">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs text-blue-100/60">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            Har bir natija bazada saqlanadi va sinf reytingi avtomatik yangilanadi.
          </div>
        </div>

        <p className="relative text-xs text-blue-100/40">© {new Date().getFullYear()} MathTest AI</p>
      </div>

      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 lg:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-base font-extrabold tracking-tight text-foreground">
              MathTest <span className="text-primary">AI</span>
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-[420px] animate-slide-up">
            <h2 className="text-balance font-display text-[26px] font-extrabold text-foreground sm:text-[30px]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
