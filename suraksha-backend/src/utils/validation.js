function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePhone(phone) {
  return stringValue(phone).replace(/\s+/g, ' ');
}

function isValidPhone(phone) {
  return /^[+]?[0-9][0-9\s-]{7,18}$/.test(phone);
}

function isValidCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function parseLocation(body = {}) {
  const lat = Number(body.lat ?? body.latitude ?? body.location?.lat);
  const lng = Number(body.lng ?? body.longitude ?? body.location?.lng);
  if (!isValidCoordinate(lat, lng)) return null;
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6))
  };
}

function parseEmergencyContacts(body = {}) {
  if (Array.isArray(body.emergencyContacts)) {
    return body.emergencyContacts
      .map((contact) => ({
        name: stringValue(contact.name),
        phone: normalizePhone(contact.phone),
        relationship: stringValue(contact.relationship)
      }))
      .filter((contact) => contact.name || contact.phone);
  }

  const name = stringValue(body.emergencyContactName);
  const phone = normalizePhone(body.emergencyContactPhone);
  return name || phone ? [{ name, phone, relationship: stringValue(body.emergencyContactRelationship) }] : [];
}

module.exports = {
  isValidCoordinate,
  isValidPhone,
  normalizePhone,
  parseEmergencyContacts,
  parseLocation,
  stringValue
};
