const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const projectRoot = path.join(backendRoot, '..');

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read JSON config at ${filePath}: ${error.message}`);
  }
}

function resolveBackendPath(value) {
  if (!value) return null;
  return path.isAbsolute(value) ? value : path.join(backendRoot, value);
}

function loadOfficers(options = {}, authConfig = {}) {
  if (Array.isArray(options.officers)) return options.officers;

  if (process.env.SURAKSHA_OFFICERS_JSON) {
    return JSON.parse(process.env.SURAKSHA_OFFICERS_JSON);
  }

  if (process.env.SURAKSHA_OFFICERS_FILE) {
    return readJson(resolveBackendPath(process.env.SURAKSHA_OFFICERS_FILE), []);
  }

  if (process.env.SURAKSHA_OFFICER_ID && process.env.SURAKSHA_OFFICER_PASSWORD) {
    return [
      {
        username: process.env.SURAKSHA_OFFICER_ID,
        password: process.env.SURAKSHA_OFFICER_PASSWORD,
        name: process.env.SURAKSHA_OFFICER_NAME || process.env.SURAKSHA_OFFICER_ID,
        role: process.env.SURAKSHA_OFFICER_ROLE || authConfig.defaultRole
      }
    ];
  }

  return [];
}

function loadConfig(options = {}) {
  const appConfigFile = options.appConfigFile || process.env.SURAKSHA_APP_CONFIG || path.join(backendRoot, 'config', 'app.json');
  const appConfig = readJson(appConfigFile, {});
  const riskZonesFile = options.riskZonesFile || process.env.SURAKSHA_RISK_ZONES_FILE || path.join(backendRoot, 'config', 'risk-zones.json');

  return {
    ...appConfig,
    paths: {
      backendRoot,
      projectRoot,
      dataFile: options.dataFile || process.env.SURAKSHA_DATA_FILE || resolveBackendPath(appConfig.data?.file),
      frontendDir: options.frontendDir || process.env.SURAKSHA_FRONTEND_DIR || path.join(projectRoot, 'frontend')
    },
    officers: loadOfficers(options, appConfig.auth),
    riskZones: readJson(riskZonesFile, [])
  };
}

module.exports = {
  loadConfig,
  readJson,
  resolveBackendPath
};
