const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createApp } = require('../src/app');

async function request(baseUrl, endpoint, options = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(`${endpoint} failed: ${body.message || response.statusText}`);
  }
  return body.data;
}

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suraksha-'));
  const dataFile = path.join(tempDir, 'data.json');
  const app = createApp({
    dataFile,
    officers: [
      {
        username: 'smoke-officer',
        password: 'smoke-password',
        name: 'Smoke Test Officer',
        role: 'control-room'
      }
    ]
  });
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.on('error', reject);
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const health = await request(baseUrl, '/api/health');
    assert.equal(health.status, 'ok');

    const login = await request(baseUrl, '/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'smoke-officer', password: 'smoke-password' })
    });
    assert.ok(login.token);

    const registration = await request(baseUrl, '/api/registerTourist', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Smoke Test Tourist',
        phone: '+919876543210',
        nationality: 'Indian',
        identityNumber: 'SMOKE-001',
        emergencyContacts: [{ name: 'Control Room', phone: '+911363000000' }]
      })
    });
    assert.ok(registration.touristId);
    assert.ok(registration.blockchainHash);

    const verified = await request(baseUrl, `/api/verifyTourist/${registration.blockchainHash}`);
    assert.equal(verified.name, 'Smoke Test Tourist');

    const location = await request(baseUrl, `/api/liveLocation/${registration.touristId}`, {
      method: 'POST',
      body: JSON.stringify({ lat: 26.1826, lng: 91.7416 })
    });
    assert.ok(location.riskScore > 0);
    assert.ok(location.transactionHash);

    const emergency = await request(baseUrl, '/api/recordEmergency', {
      method: 'POST',
      body: JSON.stringify({
        touristId: registration.touristId,
        emergencyType: 'MEDICAL',
        description: 'Smoke test emergency record',
        location: { lat: 26.1826, lng: 91.7416 }
      })
    });
    assert.ok(emergency.emergencyId);

    const stats = await request(baseUrl, '/api/stats');
    assert.equal(stats.totalTourists, 1);
    assert.equal(stats.totalEmergencies, 1);
    assert.ok(stats.blockHeight >= 3);

    const audit = await request(baseUrl, '/api/audit');
    assert.ok(audit.length >= 3);

    const html = await fetch(baseUrl).then((response) => response.text());
    assert.match(html, /Suraksha Yatra/);

    console.log('Smoke test passed.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
