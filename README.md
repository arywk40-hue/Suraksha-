# 🔐 Suraksha  

> A blockchain-powered solution for secure, transparent, and decentralized data handling.  
> Built as part of **Smart India Hackathon (SIH)** to ensure trust, security, and scalability in digital systems.  

🌐 **Live Demo**: [Suraksha Deployment](https://suraksha-drab.vercel.app/)  

---

## 📌 Table of Contents  
- [About the Project](#-about-the-project)  
- [Features](#-features)  
- [Tech Stack](#-tech-stack)  
- [Project Structure](#-project-structure)  
- [Getting Started](#-getting-started)  
- [Usage](#-usage)  
- [Screenshots](#-screenshots)  
- [Future Scope](#-future-scope)  
- [Contributors](#-contributors)  
- [License](#-license)  

---

## 📖 About the Project  

**Suraksha** is designed to provide a **secure and transparent system** using blockchain technology.  
It ensures that data integrity is maintained and transactions remain immutable, making it suitable for applications like:  
- Digital identity verification  
- Secure medical records  
- Fraud detection & prevention  
- Transparent record-keeping  

---

## ✨ Features  
✅ Blockchain-based data verification  
✅ Immutable transaction storage  
✅ Lightweight server setup with Node.js  
✅ Easy-to-deploy frontend (HTML + JS)  
✅ Scalable and secure architecture  

---

## 🛠 Tech Stack  

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js, Express.js  
- **Blockchain:** Custom implementation in JavaScript  
- **Deployment:** Vercel  

---

## 📂 Project Structure  

```
Suraksha-/
├── demo.html                   # Full-featured demo page (standalone)
├── demo/
│   └── demo.html               # Demo index (links to root demo.html)
├── suraksha-backend/           # Primary backend (Express + file-based DB)
│   ├── index.js                # API server (port 3000)
│   ├── data.json               # Persistent data store
│   ├── firebase.json           # Firebase config placeholder
│   ├── package.json
│   └── package-lock.json
├── work/                       # Active development folder
│   ├── frontend/
│   │   ├── index.html          # Login + dashboard (Firebase auth)
│   │   └── firebase-config.js  # Firebase project config
│   └── suraksha-backend/
│       ├── index.js            # Backend for work frontend
│       ├── data.json           # Persistent data store
│       └── package.json
├── package.json                # Root scripts (npm run work-start)
└── README.md
```

---

## 🚀 Getting Started  

### Prerequisites
- Node.js v16+
- npm

### Run the working app locally

```bash
# Install dependencies
cd suraksha-backend
npm install

# Start the server (serves frontend + API on port 3000)
cd ..
npm run work-start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Login:** any username + password will work (mock auth in development mode).

### Optional: Firebase Authentication
To enable Google Sign-In and Phone OTP:
1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Google** and **Phone** providers under Authentication
3. Copy your Firebase config into `work/frontend/firebase-config.js`

---

## 📱 Usage  

| Feature | How to use |
|---|---|
| **Register Tourist** | Fill name, phone, nationality → click "Register on Blockchain" |
| **Verify Identity** | Paste the blockchain hash returned at registration → click "Verify" |
| **Live Tracking** | Go to "Live Tracking" tab → click "Start Tracking" (browser location required) |
| **Record Emergency** | Fill emergency type, description, location → click "RECORD EMERGENCY" |
| **SOS Alert** | On tracking page, click "Send SOS" to trigger an instant alert |
| **Blockchain Stats** | Auto-refreshed on dashboard; click "Refresh" for manual update |

---

## 🖼 Screenshots  

Visit the [Live Demo](https://suraksha-drab.vercel.app/) to see the app in action.

---

## 🔭 Future Scope  

- 🔗 Integration with Ethereum / Hyperledger for real blockchain immutability  
- 📲 Mobile app (React Native) with push notifications  
- 🗺 Heatmap of tourist density & risk zones  
- 🤖 AI-based risk scoring using historical crime data  
- 🏛 Integration with government identity APIs (Aadhaar, DigiLocker)  
- 📡 Offline-capable PWA for low-connectivity areas  

---

## 👥 Contributors  

Built with ❤️ for **Smart India Hackathon (SIH)**

---

## 📄 License  

This project is licensed under the [MIT License](LICENSE).