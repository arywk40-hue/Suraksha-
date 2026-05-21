function isHourInWindow(hour, window) {
  if (window.startHour <= window.endHour) {
    return hour >= window.startHour && hour <= window.endHour;
  }
  return hour >= window.startHour || hour <= window.endHour;
}

function distanceKm(from, to) {
  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const fromLat = (from.lat * Math.PI) / 180;
  const toLat = (to.lat * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(fromLat) * Math.cos(toLat);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function riskLevel(score, config) {
  if (score >= config.risk.highThreshold) return config.risk.levels.high;
  if (score >= config.risk.mediumThreshold) return config.risk.levels.medium;
  return config.risk.levels.low;
}

function computeRisk(location, config, riskZones = [], date = new Date()) {
  let score = config.risk.baseScore;
  const factors = [];
  const hour = date.getHours();

  const activeWindow = config.risk.timeWindows.find((window) => isHourInWindow(hour, window));
  if (activeWindow) {
    score += activeWindow.score;
    factors.push(activeWindow.label);
  }

  let nearestZone = null;
  for (const zone of riskZones) {
    const distance = distanceKm(location, { lat: zone.lat, lng: zone.lng });
    if (!nearestZone || distance < nearestZone.distanceKm) {
      nearestZone = { id: zone.id, name: zone.name, distanceKm: Number(distance.toFixed(2)) };
    }
    if (distance <= zone.radiusKm) {
      const proximity = 1 - distance / zone.radiusKm;
      score += zone.weight * Math.max(0.4, proximity);
      factors.push(`Near ${zone.name}`);
    }
  }

  const riskScore = Number(Math.min(config.risk.maxScore, score).toFixed(2));
  const level = riskLevel(riskScore, config);

  return {
    riskScore,
    riskLevel: level,
    safetyAlert: config.risk.messages[level],
    factors,
    nearestZone
  };
}

module.exports = {
  computeRisk
};
