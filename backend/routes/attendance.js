const express = require('express');
const Attendance = require('../models/Attendance');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Today attendance for current user
router.get('/me/today', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = startOfDay();
    const record = await Attendance.findOne({ user: userId, date: today });
    const status = record ? record.status : 'Absent';

    // count confirmed bookings for today
    const tripsToday = await Trip.find({
      startTime: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    }).select('_id');
    const tripIds = tripsToday.map((t) => t._id);
    const slotCount = await Booking.countDocuments({
      user: userId,
      trip: { $in: tripIds },
      status: 'confirmed',
    });

    res.json({
      date: today,
      status,
      slotsToday: slotCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load today attendance' });
  }
});

// Summary for current user over last N days (default 30)
router.get('/me/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = Number(req.query.days || '30');
    const end = startOfDay();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const records = await Attendance.find({
      user: userId,
      date: { $gte: start, $lte: end },
    });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'Present').length;
    const percent = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

    res.json({
      from: start,
      to: end,
      totalDays,
      presentDays,
      percent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load summary' });
  }
});

module.exports = router;

