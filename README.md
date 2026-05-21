# Suraksha Yatra

Suraksha Yatra is a local full-stack MVP for tourist safety operations. It combines a static control-room frontend with an Express API, JSON persistence, risk scoring for live movement, emergency recording, and a hash-linked audit ledger.

## What Is Included

- Officer login for local MVP access
- Tourist registration with identity hash generation
- Blockchain-style audit blocks for registration, location updates, SOS, and emergency status changes
- Tourist verification by blockchain hash
- Live tracking simulation and browser geolocation support
- Risk scoring against time-of-day and configured risk zones
- Emergency and SOS recording with dispatch statuses
- Tourist, emergency, and ledger views in the frontend
- Smoke test covering the end-to-end API workflow

## Project Structure

```text
.
|-- frontend/                 # Served control-room UI
|-- suraksha-backend/         # Express API and JSON data store
|   |-- index.js              # API server
|   |-- smoke-test.js         # End-to-end smoke test
|   `-- data.json             # Local persisted data
|-- demo.html                 # Older standalone demo
|-- work/                     # Older working prototype copy
`-- package.json              # Root scripts
```

## Quick Start

Install dependencies:

```bash
npm install --prefix suraksha-backend
```

Run the app:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Default local login:

```text
Officer ID: admin
Password: admin
```
## Test

```bash
npm test
```

The smoke test starts the Express app on a temporary local port, registers a tourist, verifies the generated hash, posts a location update, records an emergency, checks stats, checks the audit ledger, and confirms the frontend is served.

## API Summary

- `GET /api/health`
- `POST /api/login`
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

## Notes

This is a complete local MVP, not a production security backend. For production, replace the local JSON store with a database, add real authentication and authorization, secure emergency notification delivery, and move the audit ledger to a tamper-resistant store or blockchain network.
