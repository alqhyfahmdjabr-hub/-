# Babel Jewelry Message Generator

A React-based web application for Babel Jewelry to create daily gold price updates and AI-enhanced marketing messages for WhatsApp and social media.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4.1 (via @tailwindcss/vite plugin)
- **AI**: Google Gemini API (@google/genai) for Arabic marketing message generation
- **Icons**: Lucide React
- **Animations**: Motion (Framer Motion)
- **Package Manager**: npm

## Project Structure

```
/
├── src/
│   ├── main.tsx        # App entry point
│   ├── App.tsx         # Main component (state, AI logic, UI tabs)
│   └── index.css       # Global styles + Tailwind directives
├── index.html          # HTML entry point
├── vite.config.ts      # Vite config (port 5000, allowedHosts, Gemini key injection)
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript config
```

## Environment Variables

- `GEMINI_API_KEY`: Required for Gemini AI API calls. Set in Replit Secrets.
- `APP_URL`: The URL where the app is hosted (optional).

## Running Locally

```bash
npm install
npm run dev
```

The app runs on port 5000 at `http://0.0.0.0:5000`.

## Deployment

Configured as a static site:
- Build command: `npm run build`
- Public directory: `dist`

## Key Features

- Gold price input (buy/sell, karat types)
- AI-powered Arabic marketing message generation via Gemini
- WhatsApp direct sharing
- Store settings persisted to localStorage
- Image upload support
