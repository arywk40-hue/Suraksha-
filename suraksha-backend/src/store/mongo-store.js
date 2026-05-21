const AuditBlock = require('../db/models/AuditBlock');
const Emergency = require('../db/models/Emergency');
const Tourist = require('../db/models/Tourist');

function toMap(items) {
  return Object.fromEntries(items.map((item) => [item.id, stripMongoFields(item)]));
}

function stripMongoFields(document) {
  const { _id, __v, ...rest } = document;
  return rest;
}

class MongoStore {
  async read() {
    const [tourists, emergencies, auditLog] = await Promise.all([
      Tourist.find().lean(),
      Emergency.find().lean(),
      AuditBlock.find().sort({ height: 1 }).lean()
    ]);

    return {
      tourists: toMap(tourists),
      emergencies: toMap(emergencies),
      auditLog: auditLog.map(stripMongoFields),
      system: {}
    };
  }

  async write(data) {
    const touristWrites = Object.values(data.tourists).map((tourist) => ({
      updateOne: {
        filter: { id: tourist.id },
        update: { $set: tourist },
        upsert: true
      }
    }));

    const emergencyWrites = Object.values(data.emergencies).map((emergency) => ({
      updateOne: {
        filter: { id: emergency.id },
        update: { $set: emergency },
        upsert: true
      }
    }));

    const auditWrites = data.auditLog.map((block) => ({
      updateOne: {
        filter: { height: block.height },
        update: { $set: block },
        upsert: true
      }
    }));

    await Promise.all([
      touristWrites.length ? Tourist.bulkWrite(touristWrites) : Promise.resolve(),
      emergencyWrites.length ? Emergency.bulkWrite(emergencyWrites) : Promise.resolve(),
      auditWrites.length ? AuditBlock.bulkWrite(auditWrites) : Promise.resolve()
    ]);
  }
}

module.exports = {
  MongoStore
};
