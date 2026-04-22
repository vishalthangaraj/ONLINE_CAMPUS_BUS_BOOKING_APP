const mongoose = require('mongoose');

async function checkBuses() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');
  
  const col = mongoose.connection.db.collection('shim_buses');
  const buses = await col.find({}).toArray();
  
  console.log('Buses in DB:', buses.length);
  if (buses.length > 0) {
    console.log('First bus:', JSON.stringify(buses[0]));
    console.log('Example Bus IDs:', buses.slice(0, 5).map(b => b._id));
  }
  
  await mongoose.connection.close();
}

checkBuses().catch(console.error);
