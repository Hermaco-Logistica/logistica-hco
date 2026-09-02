# AGENTS.md

React (Vite) SPA for Hermaco logistics (RFQ/cotización/pedidos/tracking), deployed on Netlify with Netlify Functions + Firebase (Firestore/Auth). UI text is Spanish.

## Commands
- `npm run dev` — local dev via **Netlify Dev** (runs serverless functions locally). This is the recommended command; plain `vite` (`npm run dev:vite`) won't serve functions.
- `npm run build` — `vite build` (outputs `dist/`).
- `npm run lint` — `eslint .`. There is **no test framework**; lint is the only verification.
- Data import scripts: `npm run import:clientes`, `npm run import:proveedores`, `npm run db:push-dhl` (Node scripts in `scripts/`).

## Serverless functions
Deployed functions live in `netlify/functions/`, called by the frontend as `/.netlify/functions/<name>`:
- `tracking-status` — DHL/DSV lookup with **Firebase ID-token auth**, Firestore cache (`tracking_cache`, TTL 5 min) and rate limiting (`tracking_rate_limits`, 5 req/5min/user). Provider hint: `?provider=DSV|DHL`.
- `send-quotation`, `send-email-notification` — email via **Resend** (needs `RESEND_API_KEY`).

Gotchas:
- There is a **duplicate legacy `api/tracking-status.js`** (Vercel-style `export default` handler, no auth/cache). It is NOT the deployed function — edit `netlify/functions/tracking-status.js`. `public/_redirects` maps `/api/tracking-status` to the real function.
- `netlify/functions/tracking-status.js` initializes firebase-admin from, in order: local `service_account_dev.json` (dev), `FIREBASE_SERVICE_ACCOUNT` env, `service_account.json`. Those files/values are gitignored/secret.
- Backend env vars (DHL/DSV keys, `FIREBASE_SERVICE_ACCOUNT`) have **no `VITE_` prefix** and only exist server-side; frontend `VITE_*` vars are separate (see `.env.example`).

## Architecture / data
- Realtime data via Firestore `onSnapshot` on `solicitudes` (RFQs); roles (vendedor/comprador/gerente/administrador) resolve from `users/{uid}` or the email, and gate which views/routes are available (see `src/App.jsx`).
- Other collections: `pedidos`, `ordenesCompra`, `tracking_cache`, `tracking_rate_limits`.
- Auth: Google Sign-in restricted to `@hermaco.net` (enforced in `src/firebase.js` via `hd: hermaco.net` and again in `App.jsx`).
- Firestore client config is **hardcoded in `src/firebase.js`** for production (literal Firebase API keys exposed in the client — expected for a web client).

## Email behavior (important)
In `src/App.jsx` (`handleGuardarCotizacion`): when running on `localhost`, all email goes **only to `rvides@hermaco.net`** for testing; in production To/CC go to the vendedor and corporate list (`src/config/emailConfig.js`). Don't "fix" this to use real recipients during local testing.

## Conventions / notes
- This repo has a design-centralization agent: `.github/agents/centralizador-diseno.agent.md` + `.github/prompts/centralizacion-diseno-fases.prompt.md` (installable GitHub Agent skills, style-token work only).
- `tailwind.config.js` is a customization-point but note Tailwind v4 is used via `@tailwindcss/postcss` (config is largely legacy).
- `service_account*.json`, `.env`, `.netlify/`, `scripts/`, `.github/`, `MAPA_FLUJO.md` are gitignored.
- Avoid `npm audit fix --force` — can force incompatible `firebase-admin` versions (see README).
