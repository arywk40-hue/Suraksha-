const { randomUUID } = require('crypto');

const { body, param } = require('express-validator');

const { asyncHandler } = require('../middleware/async-handler');
const { validate } = require('../middleware/validate');
const { addBlock } = require('../services/ledger-service');
const { publicTourist, sortNewest } = require('../services/data-service');
const { generateId, hashPayload } = require('../utils/hash');
const { sendError, sendSuccess } = require('../utils/http');
const { nowIso } = require('../utils/time');
const { isValidPhone, normalizePhone, parseEmergencyContacts, stringValue } = require('../utils/validation');

function registerTouristRoutes(app, context) {
  app.post(
    '/api/registerTourist',
    [
      body('name').trim().isLength({ min: context.config.validation.minimumNameLength }).withMessage('Name is too short.'),
      body('phone').custom((value) => isValidPhone(normalizePhone(value))).withMessage('Phone number must be valid.'),
      body().custom((value) => {
        const identityNumber = stringValue(value.identityNumber || value.aadhaar || value.passport);
        if (identityNumber.length < context.config.validation.minimumIdentityLength) {
          throw new Error('Identity number is required.');
        }
        return true;
      }),
      body().custom((value) => {
        const invalidContact = parseEmergencyContacts(value).find((contact) => contact.phone && !isValidPhone(contact.phone));
        if (invalidContact) throw new Error(`Emergency contact phone is invalid: ${invalidContact.phone}`);
        return true;
      })
    ],
    validate,
    asyncHandler(async (req, res) => {
      const name = stringValue(req.body.name);
      const phone = normalizePhone(req.body.phone);
      const nationality = stringValue(req.body.nationality) || context.config.defaults.nationality;
      const identityNumber = stringValue(req.body.identityNumber || req.body.aadhaar || req.body.passport);
      const emergencyContacts = parseEmergencyContacts(req.body);

      const data = await context.store.read();
      const duplicate = Object.values(data.tourists).find((tourist) => tourist.identityNumber.toLowerCase() === identityNumber.toLowerCase());
      if (duplicate) return sendError(res, 409, 'A tourist with this identity number already exists.', publicTourist(duplicate, context.config));

      const touristId = generateId(context.config.ids.touristPrefix, data.tourists);
      const registeredAt = nowIso();
      const blockchainHash = hashPayload({ touristId, identityNumber, name, phone, registeredAt, nonce: randomUUID() });

      const tourist = {
        id: touristId,
        name,
        phone,
        nationality,
        identityNumber,
        emergencyContacts,
        blockchainHash,
        isActive: true,
        currentRisk: 0,
        riskLevel: context.config.risk.defaultLevel,
        registeredAt,
        lastUpdated: registeredAt,
        locationHistory: []
      };

      data.tourists[touristId] = tourist;
      const block = await addBlock(data, context.config, 'TOURIST_REGISTERED', { touristId, blockchainHash });
      await context.saveData(data);

      return sendSuccess(res, {
        touristId,
        blockchainHash,
        transactionHash: block.hash,
        blockHeight: block.height,
        tourist: publicTourist(tourist, context.config)
      }, 201);
    })
  );

  app.get('/api/tourists', asyncHandler(async (req, res) => {
    const data = await context.store.read();
    sendSuccess(res, sortNewest(Object.values(data.tourists), 'registeredAt').map((tourist) => publicTourist(tourist, context.config)));
  }));

  app.get(
    '/api/tourists/:id',
    [param('id').trim().notEmpty().withMessage('Tourist ID is required.')],
    validate,
    asyncHandler(async (req, res) => {
      const data = await context.store.read();
      const tourist = data.tourists[req.params.id];
      if (!tourist) return sendError(res, 404, 'Tourist not found.');
      return sendSuccess(res, publicTourist(tourist, context.config));
    })
  );

  app.get(
    '/api/verifyTourist/:hash',
    [param('hash').trim().notEmpty().withMessage('Blockchain hash is required.')],
    validate,
    asyncHandler(async (req, res) => {
      const data = await context.store.read();
      const hash = stringValue(req.params.hash);
      const tourist = Object.values(data.tourists).find((item) => item.blockchainHash === hash);
      if (!tourist) return sendError(res, 404, 'No tourist record matches that blockchain hash.');
      return sendSuccess(res, publicTourist(tourist, context.config));
    })
  );
}

module.exports = {
  registerTouristRoutes
};
