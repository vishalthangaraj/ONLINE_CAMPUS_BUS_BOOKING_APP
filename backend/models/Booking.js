const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema(
  {
    seatNumber: { type: Number, required: true },
    name: { type: String, required: true },
    age: { type: Number },
    gender: { type: String, enum: ['M', 'F', 'O'] },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    seatNumber: { type: Number, required: true },
    passengers: [passengerSchema],
    status: {
      type: String,
      enum: ['confirmed', 'waitlisted', 'cancelled'],
      default: 'confirmed',
    },
    cancelDisabled: { type: Boolean, default: false },
    cancellationSequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
