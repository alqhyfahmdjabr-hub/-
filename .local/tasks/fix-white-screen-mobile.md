# Fix White Screen on Mobile

## What & Why
The app shows a completely blank white screen when opened from a mobile browser. This happens because there is no error boundary wrapping the app — any JavaScript error during rendering silently crashes the entire UI with no fallback. The initial API calls to `/api/settings` and `/api/schedule` could also fail silently and cause a crash.

## Done looks like
- Opening the app on a mobile browser no longer shows a blank white screen
- If an error does occur, the user sees a friendly Arabic error message instead of a white screen
- The app loads correctly on mobile (same experience as on desktop)

## Out of scope
- Redesigning the UI
- Adding new features

## Tasks
1. **Add Error Boundary** — Create a React Error Boundary component that wraps the entire app and displays a friendly Arabic error message if any unhandled JavaScript error occurs during render.
2. **Harden initial data loading** — Wrap the initial `fetch('/api/settings')` and `fetch('/api/schedule')` calls in `useEffect` with proper try/catch so a network failure does not crash the app.
3. **Fix `process.env` usage** — Verify that `process.env.GEMINI_API_KEY` is safely handled — if undefined, disable AI mode gracefully instead of crashing.

## Relevant files
- `src/main.tsx`
- `src/App.tsx:112-135`
- `src/App.tsx:244-246`
- `vite.config.ts`
