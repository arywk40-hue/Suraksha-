# Suraksha Work

This folder contains the working app (frontend + simple Express backend) used for development.

Quick start

1. Add Firebase config (optional) to `work/frontend/firebase-config.js` by replacing the placeholder with your project's config:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://<PROJECT>.firebaseio.com",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

2. Start the backend (serves frontend at http://localhost:3000):

```bash
npm run work-start
```

3. Open http://localhost:3000 in your browser.

Notes
- Google sign-in and phone OTP are available if you supply Firebase config and enable the providers in Firebase Console.
- The backend is a simple file-based mock (data in `work/suraksha-backend/data.json`). For production, replace with a real DB and authentication middleware.
