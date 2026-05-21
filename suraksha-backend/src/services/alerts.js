const twilio = require('twilio');

let twilioClient;

function getTwilioClient() {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) return null;
  if (!twilioClient) twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

function formatLocation(location) {
  if (!location) return 'unknown location';
  return `${location.lat}, ${location.lng}`;
}

async function dispatchSosAlerts(tourist, emergency) {
  const client = getTwilioClient();
  const contacts = (tourist?.emergencyContacts || []).filter((contact) => contact.phone);

  if (!client) {
    return {
      provider: 'twilio',
      configured: false,
      sent: 0,
      failed: 0
    };
  }

  if (!contacts.length) {
    return {
      provider: 'twilio',
      configured: true,
      sent: 0,
      failed: 0
    };
  }

  const body = [
    `Suraksha SOS for ${tourist.name}.`,
    `Emergency ID: ${emergency.id}.`,
    `Location: ${formatLocation(emergency.location)}.`
  ].join(' ');

  const results = await Promise.allSettled(
    contacts.map((contact) =>
      client.messages.create({
        from: process.env.TWILIO_FROM_NUMBER,
        to: contact.phone,
        body
      })
    )
  );

  return {
    provider: 'twilio',
    configured: true,
    sent: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length
  };
}

module.exports = {
  dispatchSosAlerts
};
