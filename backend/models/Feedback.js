const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    tags: [{ type: String, enum: ['late', 'crowded', 'clean', 'on_time', 'comfortable'] }],
    comment: { type: String },
  },
  { timestamps: true }
);

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
