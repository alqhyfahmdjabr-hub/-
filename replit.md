# Babel Jewelry Message Generator

تطبيق لمجوهرات بابل لإنشاء تحديثات أسعار الذهب اليومية ورسائل تسويقية عبر واتساب.
يعمل كتطبيق ويب (React) وكتطبيق موبايل (Expo / React Native).

## Tech Stack

- **Web Frontend**: React 19 + TypeScript + Tailwind CSS 4 + Vite 6 (port 5000)
- **Mobile App**: Expo (React Native) + expo-router + @tanstack/react-query (port 8080)
- **Backend**: Express.js (TypeScript) على منفذ 3001
- **Database**: PostgreSQL (Replit built-in)
- **AI**: Google Gemini API (gemini-2.0-flash) - Backend + Frontend
- **Scheduling**: node-cron للتذكير اليومي التلقائي
- **Package Manager**: npm

## Project Structure

```
/
├── src/                    # Web frontend (React + Vite)
│   ├── main.tsx
│   ├── App.tsx
│   └── index.css
├── mobile/                 # Expo mobile app
│   ├── app/
│   │   ├── _layout.tsx     # Root layout (providers)
│   │   └── (tabs)/
│   │       ├── _layout.tsx # Tab bar
│   │       ├── index.tsx   # Generator screen
│   │       ├── preview.tsx # Preview & Share screen
│   │       ├── history.tsx # History screen
│   │       └── settings.tsx# Settings screen
│   ├── lib/
│   │   ├── query-client.ts # API client + getApiUrl()
│   │   └── AppContext.tsx  # Shared state (generated message, image)
│   ├── components/
│   │   └── ErrorBoundary.tsx
│   ├── app.json
│   ├── babel.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .env               # EXPO_PUBLIC_API_URL → backend port 3001
├── server.ts               # Express backend (API routes + cron + AI)
├── vite.config.ts          # Vite config (port 5000, proxy /api → 3001)
└── package.json
```

## Database Schema

- **store_settings**: إعدادات المتجر (الاسم، الفروع، أرقام التواصل)
- **gold_prices**: سجل تاريخي لأسعار الذهب
- **messages**: الرسائل المُولَّدة المحفوظة
- **scheduled_tasks**: إعدادات التذكير اليومي التلقائي

## API Routes (Backend port 3001)

- `GET/PUT /api/settings` - إعدادات المتجر
- `GET/POST/DELETE /api/gold-prices` - سجل الأسعار
- `GET/POST/DELETE /api/messages` - الرسائل المحفوظة
- `POST /api/generate-message` - توليد رسالة بالذكاء الاصطناعي (Gemini)
- `GET /api/gold-price/live` - السعر الدولي الفوري للذهب
- `GET/PUT /api/schedule` - إعدادات الجدولة
- `GET /api/health` - فحص حالة الخادم

## Workflows

- **Start application**: `npm run dev` على منفذ 5000 (webview - تطبيق الويب)
- **Backend API**: `npm run server` على منفذ 3001 (console - الباك-إند)
- **Expo Mobile App**: `cd mobile && npx expo start --port 8080` (console - تطبيق الموبايل)

## Environment Variables

- `GEMINI_API_KEY`: مطلوب لـ Gemini AI
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: PostgreSQL
- `EXPO_PUBLIC_API_URL`: (في mobile/.env) عنوان الباك-إند للتطبيق الموبايل

## Mobile App Features

1. **شاشة الإنشاء**: إدخال الأسعار + العيار + العملة + ملاحظة + صورة + توليد AI
2. **شاشة المعاينة**: عرض الرسالة + نسخ + إرسال واتساب + إعادة التوليد
3. **شاشة السجل**: تاريخ الرسائل والأسعار مع إمكانية الحذف
4. **شاشة الإعدادات**: إعدادات المتجر + الجدولة التلقائية
