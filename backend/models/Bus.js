const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, unique: true },
    capacity: { type: Number, default: 32 },
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Bus = mongoose.model('Bus', busSchema);

module.exports = Bus;
