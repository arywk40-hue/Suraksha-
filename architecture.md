# Suraksha Yatra Architecture

## Current Production Shape

```text
Browser control room
  |
  | static assets and Socket.IO client
  v
Vercel
  |
  | /api/* and /socket.io/* rewrites
  v
Railway backend
  |-- Express REST API
  |-- JWT officer auth
  |-- Socket.IO realtime events
  |-- Helmet, CORS, rate limits, validation, pino logs
  |-- JSON store for local development
  |-- MongoDB store when MONGO_URI is configured
  |-- Redis cache when UPSTASH_REDIS_URL is configured
  |-- Twilio SOS alerts when Twilio secrets are configured
  `-- IPFS audit anchoring when Pinata secrets are configured
        |
        v
Polygon registry contract in contracts/
```

## Backend Runtime

The backend chooses storage at startup:

- `MONGO_URI` present: use MongoDB models in `suraksha-backend/src/db`.
- `MONGO_URI` absent: use the JSON adapter in `suraksha-backend/src/store/json-store.js`.

All mutating routes call the same store interface, then append a hash-linked audit block. Audit blocks are pinned to IPFS only when Pinata credentials are present, keeping local development fast and offline-friendly.

## Auth And API Boundaries

Public endpoints:

- `GET /api/health`
- `GET /api/config`
- `POST /api/login`
- `POST /api/logout`

All other `/api/*` endpoints require `Authorization: Bearer <token>`.

Officer credentials come from environment variables, `SURAKSHA_OFFICERS_JSON`, or `suraksha-backend/config/officers.json`. Use bcrypt hashes for production credentials.

## Deployment Notes

- Railway runs the backend from `suraksha-backend/Dockerfile`.
- Vercel serves `frontend/` and rewrites API and Socket.IO traffic to Railway.
- GitHub Actions runs install, smoke tests, npm audit, a lightweight secret scan, and an optional Railway deploy hook.
- Secrets stay outside git in Railway, Vercel, GitHub Actions, or the local `.env` file.
