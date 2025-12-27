const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const init = { tourists: {}, emergencies: {}, system: { totalTourists: 0, totalEmergencies: 0, blockHeight: 0 } };
    fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Failed reading data file, reinitializing.', e);
    const init = { tourists: {}, emergencies: {}, system: { totalTourists: 0, totalEmergencies: 0, blockHeight: 0 } };
    fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2));
    return init;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

// Serve the new work frontend (correct path)
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use('/', express.static(FRONTEND_DIR));
  console.log('📁 Serving frontend from', FRONTEND_DIR);
} else {
  console.warn('Frontend directory not found at', FRONTEND_DIR);
}

// --- AUTH ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    return res.json({ success: true, data: { token: 'mock-token-' + Date.now(), user: { name: 'Officer Arjun', role: 'admin' } } });
  }
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// --- REGISTER TOURIST ---
app.post('/api/registerTourist', (req, res) => {
  try {
    const { name, phone, nationality, emergencyContacts } = req.body;
    const data = loadData();
    const touristId = 'T-' + Date.now().toString().slice(-5);
    const blockchainHash = crypto.createHash('sha256').update((name || '') + Date.now()).digest('hex');

    data.tourists[touristId] = {
      id: touristId,
      name,
      phone,
      nationality,
      emergencyContacts: emergencyContacts || [],
      blockchainHash,
      isActive: true,
      registeredAt: new Date().toISOString()
    };

    data.system.totalTourists = (data.system.totalTourists || 0) + 1;
    data.system.blockHeight = (data.system.blockHeight || 0) + 1;
    saveData(data);

    res.json({ success: true, data: { touristId, blockchainHash } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// --- LIVE LOCATION & AI RISK ---
app.post('/api/liveLocation/:id', (req, res) => {
  try {
    const { lat, lng } = req.body;
    const data = loadData();
    const id = req.params.id;
    if (!data.tourists[id]) return res.status(404).json({ success: false, message: 'Tourist not found' });

    const hour = new Date().getHours();
    const isHighRisk = (hour >= 22 || hour <= 5);
    const riskScore = isHighRisk ? 0.85 : 0.15;

    data.tourists[id].lastLocation = { lat, lng };
    data.tourists[id].currentRisk = riskScore;
    data.tourists[id].lastUpdated = new Date().toISOString();
    saveData(data);

    res.json({ success: true, data: { riskScore, safetyAlert: isHighRisk ? '⚠️ High Risk: Night Travel Detected' : '✅ Safe Zone' } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// --- RECORD EMERGENCY ---
app.post('/api/recordEmergency', (req, res) => {
  try {
    const { emergencyType, description, location } = req.body;
    const data = loadData();
    const emergencyId = 'EM-' + Date.now();

    data.emergencies[emergencyId] = { id: emergencyId, type: emergencyType, description, location, status: 'OPEN', timestamp: new Date().toISOString() };
    data.system.totalEmergencies = (data.system.totalEmergencies || 0) + 1;
    saveData(data);

    res.json({ success: true, data: { emergencyId } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// --- GET STATS ---
app.get('/api/stats', (req, res) => {
  try {
    const data = loadData();
    res.json({ success: true, data: data.system || { totalTourists: 0, totalEmergencies: 0, blockHeight: 0 } });
  } catch (e) {
    res.json({ success: true, data: { totalTourists: 0, totalEmergencies: 0, blockHeight: 0 } });
  }
});

// --- VERIFY TOURIST ---
app.get('/api/verifyTourist/:hash', (req, res) => {
  try {
    const data = loadData();
    const hash = req.params.hash;
    const match = Object.values(data.tourists).find(t => t.blockchainHash === hash);
    if (!match) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: match });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Suraksha work-backend listening on http://localhost:${PORT}`));
