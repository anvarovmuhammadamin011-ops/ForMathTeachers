import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  FileText,
  Info,
  School,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/progress';
import { ErrorState } from '@/components/empty-state';
import { useApi } from '@/lib/useApi';
import { api, errorMessage, ApiError } from '@/lib/api';
import type { ClassroomSummary } from '@/lib/types';

interface HealthResponse {
  ok: boolean;
  database: boolean;
  aiConfigured: boolean;
  aiModel: string;
  ocrEnabled: boolean;
}

const MAX_MB = 30;

export default function NewTestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('classroomId') ?? '';

  const { data: classesData, loading, error, reload } = useApi<{ classrooms: ClassroomSummary[] }>(
    '/api/classes',
  );
  const { data: health } = useApi<HealthResponse>('/api/health');

  const [title, setTitle] = useState('');
  const [classroomId, setClassroomId] = useState(preselected);
  const [duration, setDuration] = useState('20');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessageText, setErrorMessageText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const classrooms = classesData?.classrooms ?? [];

  useEffect(() => {
    if (!classroomId && classrooms.length > 0) {
      setClassroomId(preselected || classrooms[0]!.id);
    }
  }, [classrooms, classroomId, preselected]);

  function pickFile(candidate: File | null) {
    setErrorMessageText('');
    if (!candidate) {
      setFile(null);
      return;
    }
    if (!candidate.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessageText('Faqat PDF fayl yuklash mumkin.');
      return;
    }
    if (candidate.size > MAX_MB * 1024 * 1024) {
      setErrorMessageText(`PDF hajmi ${MAX_MB} MB dan oshmasligi kerak.`);
      return;
    }
    setFile(candidate);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessageText('');
    if (title.trim().length < 2) {
      setErrorMessageText('Test nomini kiriting.');
      return;
    }
    if (!classroomId) {
      setErrorMessageText('Sinfni tanlang.');
      return;
    }
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
      setErrorMessageText('Vaqt 1 dan 240 daqiqagacha bo‘lishi kerak.');
      return;
    }
    if (!file) {
      setErrorMessageText('PDF faylni yuklang.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('classroomId', classroomId);
    formData.append('durationMinutes', String(minutes));
    formData.append('pdf', file);

    setSubmitting(true);
    try {
      const data = await api<{ testId: string; jobId: string }>('/api/tests', {
        method: 'POST',
        body: formData,
      });
      navigate(`/teacher/tests/${data.testId}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'AI_NOT_CONFIGURED') {
        setErrorMessageText(
          'AI xizmati sozlanmagan. backend/.env faylida AI_API_KEY ni kiriting — usiz PDF konvertatsiyasi ishlamaydi.',
        );
      } else {
        setErrorMessageText(errorMessage(err));
      }
      setSubmitting(false);
    }
  }

  if (loading && !classesData) return <PageSkeleton />;
  if (error && !classesData) {
    return <ErrorState description={error} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }

  if (classrooms.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Yangi test yaratish"
          description="Test yaratishdan oldin kamida bitta sinf kerak."
          backTo="/teacher/tests"
          backLabel="Testlarim"
        />
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-soft text-primary">
              <School className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Avval sinf yarating</h3>
            <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
              Har bir test ma’lum bir sinfga biriktiriladi. Sinf yarating — test shu sinf
              o‘quvchilariga taqdim etiladi.
            </p>
            <Button asChild className="mt-5">
              <Link to="/teacher/classrooms">
                <School className="h-4 w-4" /> Sinflarim sahifasiga o‘tish
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const aiReady = health?.aiConfigured ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yangi test yaratish"
        description="PDF yuklang — AI savollarni o‘qiydi, yechadi, javoblarni tekshiradi va A/B/C/D test tayyorlaydi."
        backTo="/teacher/tests"
        backLabel="Testlarim"
      />

      {health && !aiReady && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-soft/70 p-4 text-sm text-warning-foreground">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">AI xizmati sozlanmagan</p>
            <p className="mt-1 leading-relaxed">
              Serverda <code className="rounded bg-white/70 px-1 py-0.5">AI_API_KEY</code> mavjud
              emas. PDF konvertatsiyasi ishlamaydi. Kalitni{' '}
              <code className="rounded bg-white/70 px-1 py-0.5">.env</code> fayliga qo‘shib,
              serverni qayta ishga tushiring. Demo testni ko‘rish uchun{' '}
              <code className="rounded bg-white/70 px-1 py-0.5">npm run seed</code> buyrug‘ini
              ishlating.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Test ma’lumotlari</CardTitle>
            <p className="text-sm text-muted-foreground">
              Test nomi, sinf va vaqt chegarasini belgilang.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {errorMessageText && (
              <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft/60 p-3.5 text-sm text-danger-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessageText}</span>
              </div>
            )}

            <Field label="Test nomi" htmlFor="title" required>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="8-sinf algebra — 1-chorak"
                maxLength={120}
                autoFocus
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sinf" htmlFor="classroom" required>
                <select
                  id="classroom"
                  value={classroomId}
                  onChange={(event) => setClassroomId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/70 bg-white/80 px-3.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md focus:border-primary/60 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/15 supports-[backdrop-filter]:bg-white/55"
                >
                  {classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name} ({classroom.studentCount} o‘quvchi)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vaqt chegarasi (daqiqa)" htmlFor="duration" required>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={240}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </Field>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">
                PDF fayl <span className="text-danger">*</span>
              </p>
              {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-soft/50 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-primary shadow-glass-sm backdrop-blur-md">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (inputRef.current) inputRef.current.value = '';
                    }}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/90 hover:text-danger"
                    aria-label="Faylni olib tashlash"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-9 text-center transition ${
                    dragging
                      ? 'border-primary bg-primary-50'
                      : 'border-white/70 bg-white/60 backdrop-blur-md hover:border-primary/40 hover:bg-white/85'
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-primary shadow-glass-sm backdrop-blur-md">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">
                    PDF ni bu yerga tashlang yoki tanlang
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Matnli, skanerlangan, formulalar va diagrammalar bilan — {MAX_MB} MB gacha
                  </p>
                </label>
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                AI natijasi avtomatik nashr qilinmaydi — siz tasdiqlaysiz.
              </span>
              <span>OCR: {health?.ocrEnabled ? 'yoqilgan' : 'o‘chirilgan'}</span>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!aiReady}>
              {!submitting && <Sparkles className="h-4 w-4" />}
              PDFni AI orqali testga aylantirish
            </Button>
            {!aiReady && health && (
              <p className="text-center text-xs text-muted-foreground">
                AI kaliti yo‘qligi sababli tugma vaqtincha o‘chirilgan.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="overflow-hidden bg-gradient-to-br from-[#0B1739] to-[#132a63] text-white">
            <CardContent className="p-5 sm:p-6">
              <Badge className="bg-white/10 text-blue-100 hover:bg-white/10">
                <Sparkles className="h-3 w-3" /> Qanday ishlaydi
              </Badge>
              <ol className="mt-4 space-y-3.5">
                {[
                  'PDF yuklanadi va sahifalarga ajratiladi.',
                  'Har bir savol (formulalar, kasrlar, diagrammalar bilan) aniqlanadi.',
                  'AI har bir masalani mustaqil yechadi.',
                  'Javob ikkinchi usulda qayta tekshiriladi.',
                  'A/B/C/D variantlar yaratiladi va sizga taqdim etiladi.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-blue-50/90">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PDF uchun talablar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {[
                'Matnli va skanerlangan PDF qo‘llab-quvvatlanadi.',
                'Matematik formulalar, kasrlar va ildizlar saqlanadi (KaTeX).',
                'Diagrammali savollar uchun sahifa rasmi ko‘rsatiladi.',
                'Ko‘p betli hujjatlar to‘liq tahlil qilinadi.',
                'O‘qilmaydigan savollar “Tekshirish talab qilinadi” deb belgilanadi.',
              ].map((item) => (
                <p key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
