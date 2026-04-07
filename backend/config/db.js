const mongoose = require('mongoose');

async function connectDB(mongoUri) {
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined');
  }

  await mongoose.connect(mongoUri, {
    dbName: 'campus_bus_booking',
  });

  console.log('MongoDB connected');
}

module.exports = { connectDB };
