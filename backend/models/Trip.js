const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    capacity: { type: Number, required: true },
    bookedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;
