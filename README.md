# Suraksha Yatra

Suraksha Yatra is a tourist-safety control room app with a static frontend, an Express API, JWT officer sessions, configurable risk scoring, emergency workflows, a hash-linked audit ledger, optional MongoDB persistence, optional IPFS anchoring, realtime Socket.IO events, Redis-backed caching, and Twilio SOS notification hooks.

## Project Structure

```text
.
|-- frontend/                    # Static control-room UI
|   `-- assets/                  # Browser CSS and JS
|-- suraksha-backend/            # Express API
|   |-- config/                  # App, officer example, and risk-zone config
|   |-- data/                    # Local JSON fallback store
|   |-- scripts/                 # Smoke tests
|   |-- src/
|   |   |-- db/                  # MongoDB connection and models
|   |   |-- middleware/          # Auth, validation, async helpers
|   |   |-- routes/              # API routes
|   |   |-- services/            # Auth, ledger, alerts, risk, data logic
|   |   |-- store/               # JSON and Mongo store adapters
|   |   `-- utils/               # Logging, cache, hash, validation helpers
|   |-- Dockerfile
|   `-- railway.json
|-- contracts/                   # Polygon audit registry contract
|-- docker-compose.yml
|-- vercel.json
|-- build.md                     # Production roadmap
`-- package.json                 # Root scripts
```

## Quick Start

```bash
npm install --prefix suraksha-backend
cp suraksha-backend/.env.example suraksha-backend/.env
cp suraksha-backend/config/officers.example.json suraksha-backend/config/officers.json
```

Create a bcrypt password hash:

```bash
node -e "const bcrypt=require('./suraksha-backend/node_modules/bcryptjs'); process.stdout.write(bcrypt.hashSync('replace-this-password', 12) + '\n');"
```

Put that hash in `suraksha-backend/config/officers.json`, set `JWT_SECRET` in `suraksha-backend/.env`, then run:

```bash
npm start
```

Open `http://localhost:3000`.

## Environment

Required for production:

- `JWT_SECRET`
- `MONGO_URI`
- `FRONTEND_URL`
- `SURAKSHA_OFFICER_ID` and `SURAKSHA_OFFICER_PASSWORD`, or `SURAKSHA_OFFICERS_FILE`

Optional integrations:

- `PINATA_JWT` or `PINATA_API_KEY` plus `PINATA_SECRET_KEY` for IPFS audit anchoring
- `UPSTASH_REDIS_URL` for stats caching
- `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` for SOS SMS alerts
- `POLYGON_RPC_URL`, `POLYGON_PRIVATE_KEY`, `POLYGON_REGISTRY_ADDRESS` for the Polygon registry deployment flow

If `MONGO_URI` is omitted, the backend uses `suraksha-backend/data/data.json` for local development.

## Test

```bash
npm test
```

The smoke test starts the backend on a temporary port, logs in, registers a tourist, verifies the hash, posts live location, records an emergency, reads stats and audit blocks, and checks the frontend.

## API

Public:

- `GET /api/health`
- `GET /api/config`
- `POST /api/login`
- `POST /api/logout`

Protected with `Authorization: Bearer <token>`:

- `POST /api/registerTourist`
- `GET /api/tourists`
- `GET /api/tourists/:id`
- `GET /api/verifyTourist/:hash`
- `POST /api/liveLocation/:id`
- `POST /api/recordEmergency`
- `POST /api/sendSOS/:id`
- `GET /api/emergencies`
- `PATCH /api/emergencies/:id`
- `GET /api/stats`
- `GET /api/audit`
- `GET /api/risk-zones`

## Deployment

Backend:

- Deploy `suraksha-backend/` to Railway.
- Configure the variables from `suraksha-backend/.env.example`.
- Use the included `Dockerfile` and `railway.json`.

Frontend:

- Deploy the repo root to Vercel.
- Update the two Railway destinations in `vercel.json` to the real backend URL after Railway assigns one.

CI:

- `.github/workflows/deploy.yml` installs dependencies, runs the smoke test, audits production dependencies, scans tracked source for obvious secrets, and can trigger Railway with `RAILWAY_DEPLOY_HOOK_URL`.
