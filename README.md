# MathTest AI 1.0

O‘qituvchi matematika PDF faylini yuklaydi, AI savollarni ajratadi, yechadi va tekshiradi, tizim esa A/B/C/D variantli test yaratadi. O‘qituvchi savollarni ko‘zdan kechirib tasdiqlaydi va testni nashr qiladi. O‘quvchilar testni belgilangan vaqt ichida topshiradi, natija va sinf reytingi avtomatik hisoblanadi.

> Interfeys tili — o‘zbekcha (lotin). Bu MVP bo‘lib, faqat 7 ta asosiy imkoniyatni qamrab oladi: autentifikatsiya, sinflar, PDF → test, testni tekshirish/nashr qilish, test topshirish, natijalar va reyting.

---

## Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS, Radix UI (shadcn uslubi), Lucide, KaTeX |
| Backend | Express.js + TypeScript, Zod validatsiya |
| Ma’lumotlar bazasi | MongoDB Atlas + Prisma ORM (Prisma 6.19; MongoDB hali Prisma 7’da qo‘llab-quvvatlanmaydi) |
| Autentifikatsiya | bcryptjs + bazada saqlanadigan sessiyalar (HMAC-SHA256 token, httpOnly cookie) |
| AI | OpenAI-mos Chat Completions API (`/v1/chat/completions`), ixtiyoriy vision |
| PDF / OCR | `pdfjs-dist`, `pdf-to-img`, `tesseract.js` |
| Tekshiruv | `nerdamer` + `mathjs` (ramziy/numerik), ikkinchi mustaqil AI yechimi |

Monorepo npm workspaces asosida: `backend/` va `frontend/`.

---

## Tezkor ishga tushirish (lokal)

Talablar:

- **Node.js 20+** (loyiha Node 24 bilan tekshirilgan)
- npm 10+
- Windows, macOS yoki Linux

```bash
# 1. Bog‘liqliklarni o‘rnatish
npm install

# 2. Backend muhit faylini yaratish
#    Windows PowerShell:
Copy-Item backend\.env.example backend\.env
#    macOS/Linux:
# cp backend/.env.example backend/.env

# 3. MongoDB Atlas’da bepul M0 cluster yarating:
#    https://cloud.mongodb.com -> Create -> M0 Free
#    Database Access: foydalanuvchi/parol
#    Network Access: o‘z IP manzilingizni qo‘shing
#    Connect -> Drivers -> connection string’ni backend/.env dagi
#    MONGODB_URI ga qo‘ying.
#    Shuningdek SESSION_SECRET ni almashtiring (production uchun albatta).

# 4. Sxema va indekslarni MongoDB’ga qo‘llash
npm run db:push

# 5. Demo ma’lumotlarni yuklash (ixtiyoriy, lekin tavsiya etiladi)
npm run seed

# 6. Backend va frontendni ishga tushirish
npm run dev
```

`npm run dev` bir vaqtda backend va frontendni ishga tushiradi. MongoDB Atlas tashqi xizmat bo‘lgani uchun alohida lokal baza jarayoni yo‘q. Backend bazaga ulanishni kutadi va ulanish paydo bo‘lgach fon vazifalarini boshlaydi.

Manzillar:

- Frontend: <http://localhost:5173>
- API: <http://localhost:4000/api>
- Health: <http://localhost:4000/api/health>

### Demo hisoblar (`npm run seed` dan keyin)

Tizimda ro‘yxatdan o‘tish yo‘q — barcha akkauntlar oldindan yaratiladi.

| Rol | Ism-familiya | Login | Parol |
|---|---|---|---|
| O‘qituvchi | Odinaxon Qodirjonova | `qodirjonovaodinaxon` | `odinaxon1999` |
| O‘quvchi | Ibrohim Ummatullayev | `ummatullayevibrohim` | `ibrohim2026` |

To‘liq o‘quvchilar ro‘yxati va ularning login/parollari **`LOGINLAR.md`** faylida. Demo sinf kodi: **`8A2026`**. Demo test AI konvertatsiyasini taqlid qilmaydi — u real bazaga yoziladi va AI kaliti bo‘lmaganda ham o‘quvchi oqimini sinash uchun xizmat qiladi. Kirish sahifasida o‘qituvchi va o‘quvchi uchun bir bosishli **demo kirish** tugmalari mavjud.

---

## Muhit o‘zgaruvchilari

Barcha backend qiymatlari **`backend/.env`** faylida saqlanadi. Server, seed, Prisma CLI va `db:push` shu faylni o‘qiydi. Frontend uchun ixtiyoriy **`frontend/.env`** (`VITE_API_URL`) mavjud.

| O‘zgaruvchi | Majburiy | Standart | Tavsif |
|---|---|---|---|
| `MONGODB_URI` | Ha | — | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `PORT` | Yo‘q | `4000` | API server porti |
| `NODE_ENV` | Yo‘q | `development` | `production` da cookie `secure` bo‘ladi |
| `SESSION_SECRET` | Productionda ha | — | Sessiya tokenlarini HMAC bilan xeshlash kaliti; productionda kamida 32 belgi |
| `CLIENT_ORIGIN` | Yo‘q | `http://localhost:5173` | CORS va Origin tekshiruvi uchun frontend manzili |
| `AI_API_KEY` | PDF konvertatsiyasi uchun | bo‘sh | OpenAI-mos API kaliti. Bo‘sh bo‘lsa konvertatsiya 503 `AI_NOT_CONFIGURED` qaytaradi |
| `AI_BASE_URL` | Yo‘q | `https://api.openai.com/v1` | OpenAI-mos API bazaviy manzili (OpenRouter va h.k.) |
| `AI_MODEL` | Yo‘q | `gpt-4o` | Matn/vision modeli |
| `AI_VISION_MODEL` | Yo‘q | `AI_MODEL` | Skanerlangan sahifalar uchun alohida model |
| `AI_SEND_PAGE_IMAGES` | Yo‘q | `true` | Sahifa rasmlarini AI ga yuborish |
| `AI_TIMEOUT_MS` | Yo‘q | `180000` | Bitta AI so‘rovi uchun taym-aut |
| `OCR_ENABLED` | Yo‘q | `true` | Skanerlangan sahifalar uchun Tesseract OCR |
| `OCR_LANGUAGE` | Yo‘q | `eng` | Tesseract tili (matematika formulalari uchun OCR cheklangan) |
| `MAX_PDF_MB` | Yo‘q | `30` | PDF faylning maksimal hajmi |

### AI kaliti haqida muhim eslatma

Loyihada **soxta AI integratsiyasi yo‘q**. `AI_API_KEY` berilmagan bo‘lsa:

- PDF yuklash rad etiladi va foydalanuvchiga aniq xabar ko‘rsatiladi;
- hech qanday savol, javob yoki yechim o‘ylab topilmaydi;
- demo seed ma’lumotlari bundan mustasno (ular AI natijasi emas, balki qo‘lda kiritilgan demo).

OpenAI-mos provayderga misol:

```env
AI_API_KEY="sk-..."
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o"
AI_VISION_MODEL="gpt-4o"
```

OpenRouter orqali:

```env
AI_API_KEY="sk-or-v1-..."
AI_BASE_URL="https://openrouter.ai/api/v1"
AI_MODEL="openai/gpt-4o"
AI_VISION_MODEL="openai/gpt-4o"
```

---

## Ish oqimi

### O‘qituvchi

1. Tayyor login va parol bilan kiradi va sinf yaratadi (6 belgili sinf kodi avtomatik beriladi).
2. Sinf sahifasida PDF yuklaydi va test nomi hamda davomiyligini kiritadi.
3. PDF fonda qayta ishlanadi. Interfeysda 5 real bosqich ko‘rinadi:
   - **O‘qish** (PDF matni va sahifalari)
   - **Ajratish** (savollar, variantlar, diagrammalar; skanerlash uchun OCR/vision)
   - **Yechish** (har bir savol yechimi va variantlari)
   - **Tekshirish** (ramziy tekshiruv + mustaqil AI yechimi)
   - **Yig‘ish** (bazaga saqlash)
4. Savollarni ko‘rib chiqadi: matn, variantlar, to‘g‘ri javob va yechimni tahrirlaydi yoki tasdiqlaydi.
5. Kamida bitta tasdiqlangan, 4 ta noyob variantli savol bo‘lsa, testni nashr qiladi.
6. Natijalar, savollar tahlili va sinf reytingini ko‘radi.

Tahrirlash savolning tasdiqlash holatini `PENDING` ga, tekshiruv holatini `NEEDS_REVIEW` ga qaytaradi — ya’ni o‘zgartirilgan savol qayta tasdiqlanmaguncha baholashda hisobga olinmaydi.

### O‘quvchi

1. Tayyor login va parol bilan kiradi. Akkauntlar o‘qituvchi yoki administrator tomonidan oldindan yaratiladi.
2. Mavjud testlar ro‘yxatidan testni boshlaydi.
3. Har bir test uchun **faqat bitta urinish**. Sahifa yangilansa yoki qayta kirilsa, faol urinish davom etadi.
4. Javob tanlanganda avtomatik saqlanadi.
5. Vaqt serverda hisoblanadi. Vaqt tugaganda urinish avtomatik topshiriladi; brauzer yopiq bo‘lsa ham fon vazifasi muddati o‘tgan urinishlarni yopadi.
6. Topshirgandan keyin natija, to‘g‘ri javoblar, yechim va sinf reytingi ko‘rinadi.

Faol urinish javobida `correctAnswer` va `solution` **hech qachon** qaytarilmaydi; ular faqat topshirilgandan keyingi natija endpointida beriladi.

---

## Tekshirish va baholash qoidalari

Har bir savol quyidagi holatlardan birini oladi:

- `VERIFIED` — faqat quyidagilar birgalikda bajarilganda:
  - 4 ta variant mavjud va ular noyob;
  - to‘g‘ri javob variantlar orasida aynan bitta;
  - ramziy/numerik tekshiruv (substitutsiya, ko‘p ildizli tenglamalarni aniqlash) muvaffaqiyatli;
  - mustaqil ikkinchi AI yechimi to‘g‘ri javob bilan mos keladi.
- `NEEDS_REVIEW` — biron-bir shart bajarilmasa yoki tekshiruv ishonchsiz bo‘lsa.

Tizim hech qachon tekshirilmagan javobni `VERIFIED` deb belgilamaydi. `NEEDS_REVIEW` savollarni o‘qituvchi qo‘lda tekshirib tasdiqlashi mumkin.

Reyting qoidalari:

- Test reytingi: ball (foiz) bo‘yicha kamayish tartibida; ball teng bo‘lsa — sarflangan vaqt kamroq bo‘lgan yuqori; ikkalasi ham teng bo‘lsa — bir xil o‘rin.
- Umumiy sinf reytingi: o‘quvchining barcha topshirilgan testlari bo‘yicha **o‘rtacha foiz** asosida; teng bo‘lsa — umumiy sarflangan vaqt kamroq bo‘lgan yuqori.
- Hali test topshirmagan o‘quvchilarga o‘rin berilmaydi (`—`).

---

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Backend + frontend (birgalikda) |
| `npm run dev:backend` | Faqat backendni ishga tushirish |
| `npm run dev:frontend` | Faqat frontendni ishga tushirish |
| `npm run db:push` | Prisma sxema va indekslarni MongoDB Atlas’ga qo‘llash |
| `npm run db:generate` | Prisma Client’ni qayta generatsiya qilish |
| `npm run db:studio` | Prisma Studio |
| `npm run seed` | Demo o‘qituvchi, o‘quvchilar, sinf va demo test |
| `npm run e2e` | 38 ta HTTP darajasidagi end-to-end tekshiruv |
| `npm run typecheck` | Backend va frontend TypeScript tekshiruvi |
| `npm run build` | Backend (`backend/dist/`) va frontend (`frontend/dist/`) production build |
| `npm start` | Build qilingan backendni ishga tushirish |

`npm run e2e` real MongoDB bazada izolyatsiyalangan ma’lumot yaratadi va oxirida ularni o‘chiradi. U quyidagilarni tekshiradi: health, autentifikatsiya, RBAC, testni boshlash, javoblarni avtosaqlash, baholash, yashirin javoblar, natija huquqlari, vaqt tugashi bilan avtomatik topshirish, test va umumiy reyting (teng ball / tezroq vaqt / bir xil o‘rin).

---

## Production

1. MongoDB Atlas’da cluster yarating va `MONGODB_URI` ni qo‘ying. Productionda alohida database user va IP allowlist ishlating.
2. `NODE_ENV=production`, kamida 32 belgili `SESSION_SECRET`, to‘g‘ri `CLIENT_ORIGIN` ni o‘rnating.
3. `npm install && npm run build`
4. `npm run db:push`
5. `npm start`

### Render (backend)

Repo ildizidagi `render.yaml` Render blueprint’i hisoblanadi. Dashboard’da **New + → Blueprint** qilib repo’ni tanlash kifoya — build, start va health check avtomatik sozlanadi.

Qo‘lda Web Service yaratilsa:

| Sozlama | Qiymat |
|---|---|
| Root Directory | bo‘sh (repo ildizi) |
| Build Command | `npm ci --include=dev && npm run db:generate && npm run build -w backend` |
| Start Command | `npm start -w backend` |
| Health Check Path | `/api/health` |

Kerakli muhit o‘zgaruvchilari: `MONGODB_URI`, `SESSION_SECRET` (32+ belgi), `CLIENT_ORIGIN`; `AI_API_KEY` PDF konvertatsiyasi uchun.

Sxemani bir marta qo‘llash (Render Shell bo‘lmasa, lokal `backend/.env` bilan):

```bash
npm run db:push
npm run seed   # ixtiyoriy: demo o‘qituvchi/o‘quvchilar
```

Render’ga xos cheklovlar:

- **Free instans 15 daqiqa harakatsizlikdan keyin uxlaydi** (cold start ~50 soniya). Doimiy uyg‘oq turishi uchun pullik instans yoki tashqi cron ping kerak.
- **Fayl tizimi vaqtinchalik**: `backend/uploads` qayta deploy/restartda tozalanadi. Yuklangan PDF va sahifa rasmlarini saqlash uchun pullik Disk yoki tashqi storage kerak.
- Fon navbati bitta jarayonda ishlaydi — bir nechta instans ishga tushirilsa, bitta PDF ikki marta qayta ishlanishi mumkin.

`backend/dist` build qilinganidan so‘ng Express `frontend/dist` ni ham tarqatadi (mavjud bo‘lsa) va SPA route’larni `index.html` ga qaytaradi. Ya’ni bitta server orqali ham ishlatish mumkin. Alohida statik hosting ishlatilsa, API manzilini proxy qiling va `CLIENT_ORIGIN` ni frontend domeniga qo‘ying.

Productionda HTTPS ishlating: `NODE_ENV=production` bo‘lganda sessiya cookie `Secure` bo‘ladi va faqat HTTPS orqali yuboriladi.

MongoDB Atlas replica set bilan keladi — Prisma tranzaksiyalari va nested write’lar shu tufayli ishlaydi. Lokal MongoDB ishlatilsa, uni `--replSet` bilan ishga tushirish shart.

---

## Loyiha tuzilishi

```
.
├─ frontend/                React + Vite frontend
│  ├─ src/
│  │  ├─ pages/             auth, teacher, student, shared sahifalar
│  │  ├─ components/        UI, matematika (KaTeX), layout
│  │  └─ lib/               API, auth, tiplar, yordamchilar
│  ├─ .env.example          ixtiyoriy VITE_API_URL
│  └─ .gitignore
├─ backend/                 Express + Prisma backend
│  ├─ src/
│  │  ├─ routes/            REST endpointlar
│  │  ├─ services/          AI, PDF/OCR, tekshiruv, urinish, reyting
│  │  ├─ middleware/        auth, origin guard, xatolar
│  │  ├─ types/             domain tiplari (role/status), Express augmentatsiyasi
│  │  └─ lib/               env, validatsiya, rate limit
│  ├─ prisma/               MongoDB schema va seed
│  ├─ scripts/              e2e
│  ├─ .env                  maxfiy lokal qiymatlar (gitga tushmaydi)
│  ├─ .env.example          namuna muhit fayli
│  └─ .gitignore
├─ .gitignore
├─ package.json             npm workspaces + umumiy skriptlar
└─ README.md
```

Ma’lumotlar bazasi modellari: `User`, `Session`, `Classroom`, `ClassroomStudent`, `Test`, `Question`, `TestAttempt`, `StudentAnswer`, `PDFProcessingJob`.

---

## Xavfsizlik

- Parollar bcrypt (cost 12) bilan xeshlanadi.
- Sessiya tokeni mijozga tasodifiy qiymat sifatida beriladi; bazada faqat HMAC-SHA256 xeshi saqlanadi.
- Cookie: `httpOnly`, `SameSite=Lax`, productionda `Secure`.
- Mutatsion so‘rovlar uchun Origin tekshiruvi.
- Login uchun rate limit.
- Har bir endpointda rol (RBAC) va egalik/membership tekshiruvi.
- O‘quvchi faqat o‘z urinishi va natijasini ko‘radi; o‘qituvchi faqat o‘z sinfi/testini.
- PDF sahifa rasmlari faqat test egasi yoki sinf a’zosiga beriladi.
- Faol urinishda to‘g‘ri javob va yechim yashiriladi.

---

## Ma’lum cheklovlar

- **AI sifati** modelga bog‘liq. PDF formualari, diagrammalar va skanerlangan sahifalar noto‘g‘ri o‘qilishi mumkin. Shu sababli o‘qituvchi tasdiqlash bosqichi majburiy.
- **OCR** standart holatda `eng` tilida ishlaydi; matematik formulalarni mukammal o‘qimaydi. Skanerlangan hujjatlar uchun vision model tavsiya etiladi.
- **SymPy ishlatilmaydi.** Tekshiruv to‘liq TypeScript’da (`nerdamer` + `mathjs`) bajariladi; Python talab qilinmaydi.
- **Diagramma kesish** (`diagramBBox`) AI taxminiga asoslanadi — ba’zi rasmlar noto‘g‘ri kesilishi mumkin.
- **Fon navbati** bitta jarayon ichida ishlaydi. Server qayta ishga tushsa, tugallanmagan ishlar `QUEUED` holatiga qaytariladi. Ko‘p instansiyali deployment uchun Redis/BullMQ kabi tashqi navbat kerak.
- **PDF cheklovi**: standart 30 MB, AI taym-aut 3 daqiqa.
- Email tasdiqlash, parolni tiklash, to‘lov, admin panel, AI chat, bildirishnomalar va gamifikatsiya **yo‘q** — bu MVP doirasidan tashqarida.
- Demo seed ma’lumotlari real AI natijasi emas va faqat oqimni sinash uchun.

---

## Muammolarni bartaraf etish

**`Environment variable not found: MONGODB_URI`**

`backend/.env` faylida `MONGODB_URI` yo‘q. `.env.example` dan nusxalang va Atlas connection string’ini qo‘ying. Placeholder (`USER:PASSWORD`) bilan ulanish ishlamaydi.

**`Server selection timed out` yoki `ECONNREFUSED`**

MongoDB Atlas’ga ulanib bo‘lmadi. Network Access bo‘limida joriy IP manzil qo‘shilganini, cluster ishlab turganini va `MONGODB_URI` to‘g‘riligini tekshiring.

**`Authentication failed`**

Database Access’dagi foydalanuvchi nomi/parol xato yoki parolda maxsus belgilar URL-encode qilinmagan. Parolni connection string’da percent-encoding bilan yozing.

**`Transactions are not supported by this deployment`**

MongoDB replica set emas. Atlas cluster ishlating yoki lokal `mongod` ni `--replSet` bilan ishga tushiring. Prisma nested write va tranzaksiyalar uchun replica set talab qiladi.

**PDF yuklashda `AI_NOT_CONFIGURED`**

`backend/.env` da `AI_API_KEY` bo‘sh. Kalit kiriting va backendni qayta ishga tushiring.

**AI 401 / 429 / model topilmadi**

`AI_API_KEY`, `AI_BASE_URL` va `AI_MODEL` qiymatlarini provayder hujjatlari bilan solishtiring.

**OCR birinchi ishda sekin**

`tesseract.js` til faylini yuklab oladi. Keyingi ishlarda tezroq bo‘ladi. OCR kerak bo‘lmasa `OCR_ENABLED=false` qiling.

**Productionda login ishlamayapti**

`NODE_ENV=production` da cookie `Secure`. HTTPS orqali oching yoki dev rejimida ishlating. `CLIENT_ORIGIN` aniq frontend domeniga teng bo‘lishi kerak.
