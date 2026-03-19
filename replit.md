# Babel Jewelry Message Generator

تطبيق React لمجوهرات بابل لإنشاء تحديثات أسعار الذهب اليومية ورسائل تسويقية عبر واتساب.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 + Vite 6
- **Backend**: Express.js (TypeScript) على منفذ 3001
- **Database**: PostgreSQL (Replit built-in)
- **AI**: Google Gemini API لتوليد رسائل عربية فخمة
- **Scheduling**: node-cron للتذكير اليومي التلقائي
- **Package Manager**: npm

## Project Structure

```
/
├── src/
│   ├── main.tsx          # App entry point
│   ├── App.tsx           # Main component (all tabs + API integration)
│   └── index.css         # Global styles + Tailwind
├── server.ts             # Express backend (API routes + cron)
├── index.html
├── vite.config.ts        # Vite config (port 5000, proxy /api → 3001)
└── package.json
```

## Database Schema

- **store_settings**: إعدادات المتجر (الاسم، الفروع، أرقام التواصل)
- **gold_prices**: سجل تاريخي لأسعار الذهب
- **messages**: الرسائل المُولَّدة المحفوظة (مع الصور)
- **scheduled_tasks**: إعدادات التذكير اليومي التلقائي

## API Routes (Backend port 3001)

- `GET/PUT /api/settings` - إعدادات المتجر
- `GET/POST/DELETE /api/gold-prices` - سجل الأسعار
- `GET/POST/DELETE /api/messages` - الرسائل المحفوظة
- `GET /api/gold-price/live` - السعر الدولي الفوري للذهب
- `GET/PUT /api/schedule` - إعدادات الجدولة
- `GET /api/health` - فحص حالة الخادم

## Workflows

- **Start application**: `npm run dev` على منفذ 5000 (webview)
- **Backend API**: `npm run server` على منفذ 3001 (console)

## Environment Variables

- `GEMINI_API_KEY`: مطلوب لـ Gemini AI
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: PostgreSQL

## Features

1. **إنشاء الرسالة**: إدخال الأسعار + جلب السعر الدولي + توليد AI
2. **المعاينة**: عرض الرسالة + نسخ + مشاركة واتساب
3. **السجل**: تاريخ الرسائل والأسعار من قاعدة البيانات
4. **الإعدادات**: إعدادات المتجر + التذكير اليومي + تعليمات WhatsApp Business API

## Deployment

Static site:
- Build: `npm run build`
- Public dir: `dist`
