const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    orderIndex: { type: Number, required: true },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    stops: [stopSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;
