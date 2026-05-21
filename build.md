# Suraksha Yatra Build Plan Status

This file tracks the production roadmap that has now been applied to the repo.

## Phase 0: Repo And Environment Setup

- Legacy `work/`, `demo/`, old Firebase/deployment files, and tracked `.env/node_modules` artifacts removed.
- Backend `.env` support added with `suraksha-backend/.env.example`.
- Local officer config moved to ignored `suraksha-backend/config/officers.json`; the committed file is only `officers.example.json`.
- Root scripts now target the real backend instead of legacy work folders.

## Phase 1: Deployable Backend

- MongoDB adapter added under `suraksha-backend/src/store/mongo-store.js`.
- Mongoose connection and models added under `suraksha-backend/src/db`.
- Backend falls back to `suraksha-backend/data/data.json` when `MONGO_URI` is not configured.
- JWT auth added with bcrypt officer password support.
- Protected API middleware now guards all non-public `/api/*` routes.

## Phase 2: Production Hardening

- `helmet`, CORS policy, JSON body limits, rate limiting, and `express-validator` middleware added.
- Structured `pino` logging added with authorization header redaction.
- Redis stats cache hook added for `UPSTASH_REDIS_URL`.
- GitHub Actions workflow added for install, tests, audit, secret scanning, and optional Railway deploy hook.

## Phase 3: Audit Anchoring

- Audit blocks remain hash-linked locally.
- Pinata/IPFS anchoring is enabled when Pinata credentials are configured.
- Polygon registry contract scaffold added at `contracts/SurakshaRegistry.sol`.
- Polygon wallet submission is intentionally left to deployment tooling so no private key handling is committed.

## Phase 4: Realtime And Scale-Out

- Socket.IO backend and browser client hooks added.
- Officer dashboards receive `location:update`, `emergency:update`, and `sos:alert` events.
- Twilio SOS alert service added for configured accounts.
- Dockerfile, Docker Compose, Railway config, and Vercel rewrite config added.

## External Setup Still Required

- Create MongoDB Atlas, Railway, Vercel, Pinata, Twilio, Upstash, and Polygon accounts as needed.
- Set secrets in the provider dashboards, not in git.
- Replace the Railway placeholder URL in `vercel.json` after the backend is deployed.
- Deploy the Polygon contract and store its address in deployment secrets if on-chain anchoring is required.
