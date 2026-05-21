const API_BASE = window.SURAKSHA_API_BASE || `${window.location.origin}/api`;

const state = {
  token: localStorage.getItem('surakshaToken'),
  user: JSON.parse(localStorage.getItem('surakshaUser') || 'null'),
  config: null,
  tourists: [],
  emergencies: [],
  audit: [],
  map: null,
  touristMarker: null,
  zoneLayers: [],
  trackingTimer: null,
  lastLocation: null,
  socket: null
};

const $ = (id) => document.getElementById(id);

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function shortHash(hash) {
  return hash ? `${hash.slice(0, 12)}...${hash.slice(-8)}` : '-';
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    element.hidden = true;
  }, 2800);
}

function setBusy(label = 'Syncing') {
  setText('syncStatus', label);
}

function setIdle() {
  setText('syncStatus', 'Synced');
}

async function api(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.message || `Request failed with ${response.status}`);
  }
  return body.data;
}

async function loadPublicConfig() {
  state.config = await api('/config');
  state.lastLocation = state.config.defaults.mapCenter;
  document.title = state.config.appName;
  setText('loginMode', titleCase(state.config.environment));
  populateConfigOptions();
  applyLocationPlaceholders();
}

function populateConfigOptions() {
  $('regNationality').innerHTML = state.config.ui.nationalities
    .map((nationality) => `<option value="${escapeHtml(nationality)}">${escapeHtml(nationality)}</option>`)
    .join('');

  $('emergencyType').innerHTML = state.config.ui.emergencyTypes
    .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(titleCase(type))}</option>`)
    .join('');
}

function applyLocationPlaceholders() {
  const center = state.config.defaults.mapCenter;
  $('emergencyLat').placeholder = center ? String(center.lat) : '';
  $('emergencyLng').placeholder = center ? String(center.lng) : '';
}

function showResult(id, message, type = 'success') {
  const element = $(id);
  element.hidden = false;
  element.className = `result-box ${type}`;
  element.innerHTML = message;
}

function clearResult(id) {
  const element = $(id);
  if (!element) return;
  element.hidden = true;
  element.textContent = '';
}

function showApp() {
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  setText('userName', state.user?.name || 'Officer');
  connectSocket();
}

function showLogin() {
  $('loginView').classList.remove('hidden');
  $('appView').classList.add('hidden');
  disconnectSocket();
}

function setView(viewName) {
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  document.querySelectorAll('.nav-button').forEach((button) => button.classList.remove('active'));
  $(`view-${viewName}`).classList.add('active');
  document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
  if (viewName === 'tracking') {
    setTimeout(() => {
      initMap();
      state.map?.invalidateSize();
    }, 80);
  }
}

async function checkLoginApi() {
  try {
    await api('/health');
    setText('loginApiStatus', state.config?.authConfigured ? 'Online' : 'Needs Officer Config');
  } catch (error) {
    setText('loginApiStatus', 'Offline');
  }
}

function updateClock() {
  setText('loginClock', new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date()));
}

async function login(event) {
  event.preventDefault();
  $('loginError').hidden = true;

  try {
    const data = await api('/login', {
      method: 'POST',
      body: JSON.stringify({
        username: $('officerId').value,
        password: $('officerPassword').value
      })
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('surakshaToken', state.token);
    localStorage.setItem('surakshaUser', JSON.stringify(state.user));
    showApp();
    await loadAll();
  } catch (error) {
    $('loginError').hidden = false;
    $('loginError').textContent = error.message;
  }
}

function logout() {
  stopSimulation();
  state.token = null;
  state.user = null;
  localStorage.removeItem('surakshaToken');
  localStorage.removeItem('surakshaUser');
  showLogin();
}

async function loadAll() {
  setBusy();
  try {
    const [stats, tourists, emergencies, audit] = await Promise.all([
      api('/stats'),
      api('/tourists'),
      api('/emergencies'),
      api('/audit?limit=25')
    ]);

    state.tourists = tourists;
    state.emergencies = emergencies;
    state.audit = audit;

    renderStats(stats);
    renderTourists();
    renderEmergencyOptions();
    renderTrackingOptions();
    renderEmergencies();
    renderAudit();
    renderRiskZones();
    setIdle();
  } catch (error) {
    setText('syncStatus', 'Offline');
    toast(error.message);
  }
}

function renderStats(stats) {
  setText('statTourists', stats.totalTourists || 0);
  setText('statOpenEmergencies', stats.openEmergencies || 0);
  setText('statActiveTourists', stats.activeTourists || 0);
  setText('statBlocks', stats.blockHeight || 0);
}

function renderTourists() {
  const query = $('touristSearch')?.value.trim().toLowerCase() || '';
  const tourists = state.tourists.filter((tourist) => {
    const text = `${tourist.name} ${tourist.phone} ${tourist.identityNumber} ${tourist.blockchainHash}`.toLowerCase();
    return text.includes(query);
  });

  if (!tourists.length) {
    $('touristsTable').innerHTML = '<tr><td colspan="6" class="empty-state">No tourists found.</td></tr>';
    return;
  }

  $('touristsTable').innerHTML = tourists.map((tourist) => `
    <tr>
      <td><strong>${escapeHtml(tourist.name)}</strong><br><span class="muted">${escapeHtml(tourist.id)}</span></td>
      <td>${escapeHtml(tourist.phone)}</td>
      <td>${escapeHtml(tourist.nationality)}</td>
      <td>${riskBadge(tourist.riskLevel, tourist.currentRisk)}</td>
      <td><code title="${escapeHtml(tourist.blockchainHash)}">${shortHash(tourist.blockchainHash)}</code></td>
      <td><button class="ghost-button" data-copy-hash="${escapeHtml(tourist.blockchainHash)}">Use Hash</button></td>
    </tr>
  `).join('');
}

function riskBadge(level, score = 0) {
  const riskLevels = state.config?.risk?.levels || {};
  const normalized = String(level || state.config?.risk?.defaultLevel || '').toUpperCase();
  const className = normalized === riskLevels.high ? 'danger' : normalized === riskLevels.medium ? 'warn' : 'ok';
  return `<span class="status-chip ${className}">${normalized} ${Math.round((score || 0) * 100)}%</span>`;
}

function renderEmergencyOptions() {
  const options = state.tourists.map((tourist) => `<option value="${escapeHtml(tourist.id)}">${escapeHtml(tourist.name)} (${escapeHtml(tourist.id)})</option>`);
  const empty = '<option value="">Unverified tourist</option>';
  $('emergencyTourist').innerHTML = empty + options.join('');
}

function renderTrackingOptions() {
  const options = state.tourists.map((tourist) => `<option value="${escapeHtml(tourist.id)}">${escapeHtml(tourist.name)} (${escapeHtml(tourist.id)})</option>`);
  $('trackingTourist').innerHTML = options.length ? options.join('') : '<option value="">Register a tourist first</option>';
}

function renderEmergencies() {
  setText('emergencyCount', `${state.emergencies.length} records`);

  if (!state.emergencies.length) {
    $('emergenciesTable').innerHTML = '<tr><td colspan="6" class="empty-state">No emergencies recorded.</td></tr>';
    return;
  }

  $('emergenciesTable').innerHTML = state.emergencies.map((emergency) => `
    <tr>
      <td><strong>${escapeHtml(emergency.type)}</strong><br><span class="muted">${escapeHtml(emergency.id)}</span></td>
      <td>${escapeHtml(emergency.touristName)}</td>
      <td>${emergency.location ? `${emergency.location.lat}, ${emergency.location.lng}` : '-'}</td>
      <td>${escapeHtml(emergency.status)}</td>
      <td>${formatDate(emergency.timestamp)}</td>
      <td>
        <select data-emergency-status="${escapeHtml(emergency.id)}">
          ${state.config.ui.emergencyStatuses.map((status) => `<option value="${status}" ${status === emergency.status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </td>
    </tr>
  `).join('');
}

function renderAudit() {
  setText('ledgerCount', `${state.audit.length} blocks`);

  if (!state.audit.length) {
    $('auditList').innerHTML = '<div class="empty-state">No ledger blocks yet.</div>';
    return;
  }

  $('auditList').innerHTML = state.audit.map((block) => `
    <article class="audit-card">
      <div class="audit-meta">
        <strong>#${block.height} ${escapeHtml(block.type)}</strong>
        <span class="muted">${formatDate(block.timestamp)}</span>
      </div>
      <code>hash: ${escapeHtml(block.hash)}</code>
      <code>previous: ${escapeHtml(block.previousHash)}</code>
    </article>
  `).join('');
}

async function registerTourist(event) {
  event.preventDefault();
  clearResult('registerResult');

  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const data = await api('/registerTourist', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showResult(
      'registerResult',
      `<strong>${escapeHtml(data.tourist.name)} registered.</strong><br>Tourist ID: ${escapeHtml(data.touristId)}<br>Hash: <code>${escapeHtml(data.blockchainHash)}</code>`
    );
    $('verifyHash').value = data.blockchainHash;
    event.currentTarget.reset();
    populateConfigOptions();
    await loadAll();
  } catch (error) {
    showResult('registerResult', error.message, 'error');
  }
}

async function verifyTourist(event) {
  event.preventDefault();
  clearResult('verifyResult');

  const hash = $('verifyHash').value.trim();
  try {
    const tourist = await api(`/verifyTourist/${encodeURIComponent(hash)}`);
    showResult(
      'verifyResult',
      `<strong>Verified: ${escapeHtml(tourist.name)}</strong><br>Phone: ${escapeHtml(tourist.phone)}<br>Registered: ${formatDate(tourist.registeredAt)}<br>Status: ${tourist.isActive ? 'Active' : 'Inactive'}`
    );
  } catch (error) {
    showResult('verifyResult', error.message, 'error');
  }
}

async function recordEmergency(event) {
  event.preventDefault();
  clearResult('emergencyResult');

  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  payload.lat = Number(payload.lat);
  payload.lng = Number(payload.lng);

  try {
    const data = await api('/recordEmergency', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showResult(
      'emergencyResult',
      `<strong>Emergency recorded.</strong><br>ID: ${escapeHtml(data.emergencyId)}<br>Transaction: <code>${escapeHtml(data.transactionHash)}</code>`
    );
    $('emergencyDescription').value = '';
    await loadAll();
  } catch (error) {
    showResult('emergencyResult', error.message, 'error');
  }
}

function initMap() {
  if (state.map || !window.L || !state.lastLocation) return;
  state.map = L.map('map').setView([state.lastLocation.lat, state.lastLocation.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);
  state.touristMarker = L.marker([state.lastLocation.lat, state.lastLocation.lng]).addTo(state.map);
  renderRiskZones();
}

function renderRiskZones() {
  if (!state.map || !window.L || !state.config) return;
  state.zoneLayers.forEach((layer) => layer.remove());
  state.zoneLayers = state.config.riskZones.map((zone) => L.circle([zone.lat, zone.lng], {
    radius: zone.radiusKm * 1000,
    color: '#b91c1c',
    fillColor: '#ef4444',
    fillOpacity: 0.14,
    weight: 1
  }).addTo(state.map).bindPopup(zone.name));
}

function selectedTouristId() {
  return $('trackingTourist').value || state.tourists[0]?.id || '';
}

function nextSimulatedLocation() {
  const current = state.lastLocation || state.config.defaults.mapCenter;
  const step = state.config.ui.simulationStep;
  state.lastLocation = {
    lat: Number((current.lat + (Math.random() - 0.35) * step).toFixed(6)),
    lng: Number((current.lng + (Math.random() - 0.35) * step).toFixed(6))
  };
  return state.lastLocation;
}

async function updateLocation(location) {
  const touristId = selectedTouristId();
  if (!touristId) {
    toast('Register a tourist before tracking.');
    stopSimulation();
    return;
  }

  state.lastLocation = location;
  initMap();
  state.touristMarker?.setLatLng([location.lat, location.lng]);
  state.map?.setView([location.lat, location.lng], 14);

  try {
    const data = await api(`/liveLocation/${touristId}`, {
      method: 'POST',
      body: JSON.stringify(location)
    });
    renderRisk(data);
    addTrackingLog(`${data.riskLevel} risk at ${location.lat}, ${location.lng}`);
    await loadAll();
  } catch (error) {
    addTrackingLog(error.message);
  }
}

function renderRisk(data) {
  const pct = Math.round(data.riskScore * 100);
  const fill = $('riskFill');
  fill.style.width = `${pct}%`;
  const riskLevels = state.config?.risk?.levels || {};
  fill.style.background = data.riskLevel === riskLevels.high ? '#b91c1c' : data.riskLevel === riskLevels.medium ? '#b45309' : '#047857';
  setText('riskLevel', `${data.riskLevel} ${pct}%`);
  setText('riskMessage', data.safetyAlert);
}

function addTrackingLog(message) {
  const item = document.createElement('li');
  item.innerHTML = `<strong>${new Date().toLocaleTimeString()}</strong><br>${escapeHtml(message)}`;
  $('trackingLog').prepend(item);
  while ($('trackingLog').children.length > 8) {
    $('trackingLog').lastElementChild.remove();
  }
}

function startSimulation() {
  if (state.trackingTimer) {
    stopSimulation();
    return;
  }
  $('simulateTrackButton').textContent = 'Stop Simulation';
  updateLocation(nextSimulatedLocation());
  state.trackingTimer = setInterval(() => updateLocation(nextSimulatedLocation()), state.config.ui.trackingIntervalMs);
}

function stopSimulation() {
  if (state.trackingTimer) clearInterval(state.trackingTimer);
  state.trackingTimer = null;
  if ($('simulateTrackButton')) $('simulateTrackButton').textContent = 'Start Simulation';
}

function useBrowserLocation() {
  if (!navigator.geolocation) {
    toast('Browser geolocation is unavailable.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => updateLocation({
      lat: Number(position.coords.latitude.toFixed(6)),
      lng: Number(position.coords.longitude.toFixed(6))
    }),
    () => toast('Location permission was not granted.')
  );
}

async function sendSOS() {
  const touristId = selectedTouristId();
  if (!touristId) {
    toast('Register a tourist before sending SOS.');
    return;
  }
  if (!state.lastLocation) {
    toast('Send a tracking location before SOS.');
    return;
  }

  try {
    const data = await api(`/sendSOS/${touristId}`, {
      method: 'POST',
      body: JSON.stringify(state.lastLocation)
    });
    toast(`SOS recorded: ${data.emergencyId}`);
    await loadAll();
  } catch (error) {
    toast(error.message);
  }
}

async function updateEmergencyStatus(event) {
  const select = event.target.closest('[data-emergency-status]');
  if (!select) return;
  const id = select.dataset.emergencyStatus;
  try {
    await api(`/emergencies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: select.value })
    });
    await loadAll();
  } catch (error) {
    toast(error.message);
  }
}

function useHashFromTable(event) {
  const button = event.target.closest('[data-copy-hash]');
  if (!button) return;
  $('verifyHash').value = button.dataset.copyHash;
  setView('dashboard');
  toast('Hash loaded into verification.');
}

function connectSocket() {
  if (!window.io || state.socket) return;

  state.socket = window.io({
    auth: {
      token: state.token
    }
  });

  state.socket.on('connect', () => {
    state.socket.emit('join:officer');
  });

  state.socket.on('location:update', (payload) => {
    renderRisk(payload);
    addTrackingLog(`${payload.riskLevel} risk at ${payload.location.lat}, ${payload.location.lng}`);
  });

  state.socket.on('sos:alert', (payload) => {
    toast(`SOS recorded: ${payload.emergencyId}`);
    loadAll();
  });

  state.socket.on('emergency:update', () => {
    loadAll();
  });
}

function disconnectSocket() {
  if (!state.socket) return;
  state.socket.disconnect();
  state.socket = null;
}

function bindEvents() {
  $('loginForm').addEventListener('submit', login);
  $('logoutButton').addEventListener('click', logout);
  $('refreshButton').addEventListener('click', loadAll);
  $('registerForm').addEventListener('submit', registerTourist);
  $('verifyForm').addEventListener('submit', verifyTourist);
  $('emergencyForm').addEventListener('submit', recordEmergency);
  $('touristSearch').addEventListener('input', renderTourists);
  $('touristsTable').addEventListener('click', useHashFromTable);
  $('emergenciesTable').addEventListener('change', updateEmergencyStatus);
  $('simulateTrackButton').addEventListener('click', startSimulation);
  $('browserLocationButton').addEventListener('click', useBrowserLocation);
  $('sosButton').addEventListener('click', sendSOS);

  document.querySelectorAll('.nav-button').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
}

async function init() {
  bindEvents();
  updateClock();
  setInterval(updateClock, 30000);

  try {
    await loadPublicConfig();
    await checkLoginApi();
  } catch (error) {
    setText('loginApiStatus', 'Config Error');
    toast(error.message);
    return;
  }

  if (state.token) {
    showApp();
    await loadAll();
  } else {
    showLogin();
  }
}

document.addEventListener('DOMContentLoaded', init);
