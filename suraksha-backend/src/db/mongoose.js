const mongoose = require('mongoose');

let connected = false;

async function connectDb(uri) {
  if (connected || mongoose.connection.readyState === 1) return;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  connected = true;
}

module.exports = {
  connectDb
};
