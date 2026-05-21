# 🏗 Suraksha Yatra — Architecture & End-to-End Deployment Plan

> **Goal:** Take the current MVP (Express + flat-file JSON + vanilla HTML) to a production-grade, publicly deployable, horizontally scalable platform.

---

## 📍 Current State (MVP)

| Layer | Technology | Limitation |
|---|---|---|
| Frontend | Vanilla HTML + Tailwind CDN | No build step, CDN-dependent, not a PWA |
| Backend | Node.js / Express | Flat `data.json` persistence — not concurrent-safe, lost on server restart |
| Auth | Mock token + Firebase (optional) | No real session management, no RBAC |
| DB | `data.json` file | Cannot scale past a single process |
| Deployment | Vercel (static only) | Backend not deployed, API calls fail in production |
| Blockchain | SHA-256 hash simulated locally | No real immutability or auditability |

---

## 🎯 Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│  Browser (PWA)   │  Mobile (React Native)  │  Officer Tablet   │
└────────┬─────────────────────┬──────────────────────┬──────────┘
         │                     │                      │
         ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CDN / Edge (Cloudflare)                    │
│    Static assets, rate limiting, DDoS protection, HTTPS        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (optional)                      │
│    Nginx / AWS API Gateway — routing, auth middleware, logs     │
└──────────┬─────────────────────────┬────────────────────────────┘
           │                         │
    ┌──────▼──────┐           ┌──────▼──────┐
    │  Auth       │           │  Core API   │
    │  Service    │           │  Service    │
    │ (Firebase / │           │ (Express /  │
    │  JWT)       │           │  Node.js)   │
    └──────┬──────┘           └──────┬──────┘
           │                         │
           └──────────┬──────────────┘
                      │
           ┌──────────▼──────────┐
           │   Database Layer    │
           │  MongoDB Atlas      │
           │  (primary store)    │
           └──────────┬──────────┘
                      │
           ┌──────────▼──────────┐
           │  Audit / Blockchain │
           │  Layer              │
           │  (IPFS / Polygon /  │
           │   custom chain)     │
           └─────────────────────┘
```

---

## 🧱 Phase-by-Phase Roadmap

### Phase 1 — Make it Deployable (1–2 weeks)
*Goal: Backend + frontend running together in the cloud, reachable at a public URL.*

#### 1.1 Replace flat-file DB with MongoDB Atlas
- Sign up for [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier: 512 MB)
- Replace `loadData()` / `saveData()` in `suraksha-backend/index.js` with Mongoose models
- Collections: `tourists`, `emergencies`, `sessions`
- Set `MONGO_URI` as an environment variable

```
# .env (never commit this)
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.abc.mongodb.net/suraksha
JWT_SECRET=<random-256-bit-string>
PORT=3000
```

#### 1.2 Add real JWT authentication
- Replace mock `'mock-token-' + Date.now()` with `jsonwebtoken`
- Store hashed passwords in DB (use `bcryptjs`)
- Protect all `/api/*` routes with an `authMiddleware` that verifies the JWT
- Roles: `admin`, `officer`, `tourist`

#### 1.3 Deploy backend to Railway / Render
- **Railway** (recommended): connect GitHub repo, set env vars, auto-deploy on push
- **Alternative**: Render.com free tier, or Fly.io
- Point `API_BASE_URL` in frontend to the deployed URL

#### 1.4 Deploy frontend to Vercel
- Move `work/frontend/` to `frontend/` (project root level)
- Add a `vercel.json` routing config so `/api/*` proxies to the Railway backend
- Vercel will auto-deploy on every push to `main`

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://suraksha-backend.railway.app/api/:path*" }
  ]
}
```

#### 1.5 Environment-aware API URL in frontend
Replace the hardcoded `http://localhost:3000/api` with:
```js
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api'; // proxied via Vercel rewrites in production
```

---

### Phase 2 — Production Hardening (2–4 weeks)
*Goal: Secure, observable, resilient.*

#### 2.1 Input validation & sanitization
- Add `express-validator` to all POST routes
- Sanitize `name`, `phone`, `description` to prevent XSS / injection
- Validate Aadhaar format server-side (12-digit regex)

#### 2.2 Rate limiting & helmet
```bash
npm install helmet express-rate-limit
```
- `helmet()` sets secure HTTP headers
- Rate-limit `/api/login` to 10 req/min per IP
- Rate-limit `/api/recordEmergency` to prevent spam

#### 2.3 Structured logging
- Replace `console.log` with [pino](https://github.com/pinojs/pino) or [winston](https://github.com/winstonjs/winston)
- Pipe logs to [Logtail](https://betterstack.com/logtail) or [Papertrail](https://www.papertrail.com/) (both free tiers available)

#### 2.4 Health check endpoint
```js
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
```
- Configure Railway / Render to poll `/health` every 30s

#### 2.5 CORS hardening
```js
app.use(cors({
  origin: ['https://suraksha-drab.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT'],
  credentials: true
}));
```

#### 2.6 CI/CD pipeline (GitHub Actions)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd suraksha-backend && npm ci && npm test
  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -X POST ${{ secrets.RAILWAY_WEBHOOK_URL }}
  # Vercel auto-deploys on push to main — no extra step needed
```

---

### Phase 3 — Real Blockchain Layer (4–8 weeks)
*Goal: Replace SHA-256 simulation with actual tamper-proof storage.*

#### Option A — IPFS (simplest, free)
- Store tourist registration JSON on [web3.storage](https://web3.storage/) or [Pinata](https://pinata.cloud/)
- Save returned `CID` (Content Identifier) in MongoDB as `blockchainHash`
- Verification: fetch from `https://ipfs.io/ipfs/<CID>` and compare hash

#### Option B — Polygon (Ethereum L2, low gas fees)
- Deploy a minimal Solidity smart contract:
  ```solidity
  contract SurakshaRegistry {
    mapping(bytes32 => bool) public registered;
    event TouristRegistered(bytes32 indexed hash, uint256 timestamp);

    function register(bytes32 hash) external {
      require(!registered[hash], "Already registered");
      registered[hash] = true;
      emit TouristRegistered(hash, block.timestamp);
    }

    function verify(bytes32 hash) external view returns (bool) {
      return registered[hash];
    }
  }
  ```
- Use [Hardhat](https://hardhat.org/) + [Alchemy](https://www.alchemy.com/) for deployment
- Backend calls contract via `ethers.js`

#### Option C — Hyperledger Fabric (enterprise, most work)
- Permissioned blockchain, no gas fees
- Suitable if project is adopted by government agencies
- Use [Hyperledger Fabric on IBM Cloud](https://www.ibm.com/cloud/blockchain-platform) or [AWS Managed Blockchain](https://aws.amazon.com/managed-blockchain/)

**Recommended for SIH demo:** Option A (IPFS) for speed, Option B (Polygon Mumbai testnet) for credibility.

---

### Phase 4 — Scale-Out Architecture (8–16 weeks)
*Goal: Handle thousands of concurrent tourists.*

#### 4.1 Containerise with Docker
```dockerfile
# suraksha-backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

```yaml
# docker-compose.yml (local dev)
services:
  backend:
    build: ./suraksha-backend
    ports: ["3000:3000"]
    environment:
      - MONGO_URI=mongodb://mongo:27017/suraksha
      - JWT_SECRET=devsecret
    depends_on: [mongo]
  mongo:
    image: mongo:7
    volumes: [mongo_data:/data/db]
volumes:
  mongo_data:
```

#### 4.2 Kubernetes on GKE / EKS (production)
- Deploy backend as a `Deployment` with 3+ replicas
- Use `HorizontalPodAutoscaler` (scale 3→20 replicas on CPU > 70%)
- MongoDB Atlas handles its own scaling (sharding)
- Use `ConfigMap` + `Secret` for env vars

#### 4.3 Real-time location with WebSockets / Socket.IO
- Replace the polling `setInterval` in the frontend with a persistent WebSocket connection
- Backend emits `location:update` and `risk:alert` events
- Officers' dashboards receive live updates without page refresh

#### 4.4 Caching layer (Redis)
- Cache `/api/stats` response for 30 seconds (avoids re-scanning entire DB on every request)
- Cache tourist verification results for 5 minutes
- Use [Upstash Redis](https://upstash.com/) (serverless Redis, free tier)

#### 4.5 Message queue for SOS alerts (Bull / BullMQ)
- When an SOS is filed, push a job to a Redis-backed queue
- A separate worker process processes the queue and dispatches:
  - SMS via Twilio
  - Push notification via FCM (Firebase Cloud Messaging)
  - Email via SendGrid

---

## 📦 Recommended Production Tech Stack

| Concern | Technology | Why |
|---|---|---|
| Frontend hosting | Vercel | Zero-config, CDN, instant deploys |
| Backend hosting | Railway.app | Simple Node.js deploy, free tier, env vars UI |
| Database | MongoDB Atlas | Managed, free 512 MB, scales to shards |
| Auth | Firebase Auth + JWT | Handles Google, Phone OTP out of the box |
| Blockchain layer | IPFS (Pinata) → Polygon Testnet | Progressive upgrade path |
| Real-time | Socket.IO | Easy WebSocket upgrade for live tracking |
| Cache | Upstash Redis | Serverless, no infra to manage |
| SMS/Alerts | Twilio | SOS dispatch, OTP |
| CI/CD | GitHub Actions | Already on GitHub, free minutes |
| Logging | Pino + Logtail | Structured JSON logs, free 1 GB/day |
| Monitoring | UptimeRobot | Free uptime ping + alerts |

---

## 🗺 Repository Structure (Target)

```
Suraksha-/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI: test → deploy backend + frontend
├── frontend/                   # React (or keep vanilla) — deployed to Vercel
│   ├── index.html
│   ├── firebase-config.js
│   └── ...
├── suraksha-backend/           # Deployed to Railway
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── tourists.js
│   │   │   ├── emergencies.js
│   │   │   └── stats.js
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── Tourist.js
│   │   │   └── Emergency.js
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verify
│   │   │   └── validate.js     # express-validator
│   │   └── services/
│   │       ├── blockchain.js   # IPFS / Polygon integration
│   │       └── alerts.js       # Twilio / FCM
│   ├── index.js
│   ├── Dockerfile
│   └── package.json
├── contracts/                  # Solidity smart contracts (Phase 3)
│   └── SurakshaRegistry.sol
├── docker-compose.yml          # Local full-stack dev
├── vercel.json                 # Frontend deploy + API proxy
├── architecture.md             # This document
└── README.md
```

---

## ✅ Immediate Next Steps (Do This Now)

1. **[ ]** Create a MongoDB Atlas free cluster → copy the `MONGO_URI`
2. **[ ]** Create a Railway.app account → create a new project from this GitHub repo
3. **[ ]** Add `MONGO_URI` and `JWT_SECRET` as env vars in Railway dashboard
4. **[ ]** Add `vercel.json` with the API rewrite rule (see Phase 1.4 above)
5. **[ ]** Replace `data.json` persistence with Mongoose in `suraksha-backend/index.js`
6. **[ ]** Update `API_BASE_URL` in frontend to be environment-aware
7. **[ ]** Push to `main` → Vercel auto-deploys frontend, Railway auto-deploys backend
8. **[ ]** Verify end-to-end: register a tourist → verify hash → check stats

---

## 📊 Estimated Costs at Scale

| Stage | Monthly Cost |
|---|---|
| MVP (0–1,000 users) | **$0** — all free tiers |
| Growth (1,000–10,000 users) | ~$25/month (Railway $5, Atlas M10 $57 → use Atlas free + Railway Starter) |
| Scale (10,000–100,000 users) | ~$200–400/month (Atlas M30, Railway Pro, Upstash paid) |
| Enterprise (government) | Negotiated contract with dedicated Kubernetes cluster |

---

*Last updated: May 2026 | Built for Smart India Hackathon (SIH)*
