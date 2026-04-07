const express = require('express');
const Feedback = require('../models/Feedback');
const Trip = require('../models/Trip');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tripId, rating, tags, comment } = req.body;
    const userId = req.user.id;
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const feedback = await Feedback.create({
      user: userId,
      trip: tripId,
      rating,
      tags,
      comment,
    });

    res.status(201).json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

router.get('/analytics/routes', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const agg = await Feedback.aggregate([
      {
        $lookup: {
          from: 'trips',
          localField: 'trip',
          foreignField: '_id',
          as: 'trip',
        },
      },
      { $unwind: '$trip' },
      {
        $group: {
          _id: '$trip.route',
          avgRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 },
          lateCount: {
            $sum: {
              $cond: [{ $in: ['late', '$tags'] }, 1, 0],
            },
          },
          crowdedCount: {
            $sum: {
              $cond: [{ $in: ['crowded', '$tags'] }, 1, 0],
            },
          },
        },
      },
    ]);

    res.json(agg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Analytics failed' });
  }
});

module.exports = router;
