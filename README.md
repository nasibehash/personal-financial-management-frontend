# Personal Financial Management Frontend

The web app for [personal-financial-management-backend](https://github.com/nasibehash/personal-financial-management-backend), built with Angular 22. The interface is in Persian (right to left) and dates are shown in the Jalali calendar.

## Features

- **Dashboard**: this month at a glance, top spending categories, recent trend, account balances, active goals and the latest transactions.
- **Transactions**: income, expenses and transfers with filters (date, type, account, category, text) and paging.
- **Accounts** and **categories**: wallets and bank accounts with derived balances, income/expense categories.
- **Reports**: summary, comparison with the previous period, spending per category and a monthly trend for a month, quarter, year or custom range.
- **Goals**: savings goals with progress, contributions, deadline and the monthly saving needed.
- **Assistant**: record a transaction from a sentence or a voice recording (with a preview before saving) and get short insights about the month.

## Development

Requirements: Node.js 22.22.3 or newer (Node 24 is what Vercel uses) and a running backend.

```bash
npm ci
npm start
```

The dev server runs on <http://localhost:4200> and forwards `/api` to `http://localhost:5120` (`proxy.conf.json`). Change the target there if your backend listens elsewhere.

```bash
npm test        # unit tests (Vitest)
npm run build   # production build in dist/personal-financial-management-frontend/browser
```

## Deploying to Vercel

1. Import the repository in Vercel. The settings come from `vercel.json` (`npm ci`, `npm run build`, output `dist/personal-financial-management-frontend/browser`); no environment variables are needed.
2. `vercel.json` rewrites `/api/*` to the backend and every other path to `index.html` (client-side routing). The backend has no CORS configuration, so the app must call it through this same-origin rewrite. To use another backend, change the `destination` of the first rewrite.
3. A free Render instance sleeps when idle, so the first request after a pause can take a while.

## Notes

- The sign-in token is kept in `localStorage` and sent as a bearer token to `/api`; a `401` response signs the user out.
- Amounts are shown with the currency label in `src/app/core/format.ts` (`CURRENCY_LABEL`).
- Voice entry needs microphone permission, a browser with `MediaRecorder`, and the AI provider configured on the backend.
