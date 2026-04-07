const express = require('express');
const Trip = require('../models/Trip');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const userTimetables = new Map();

router.post('/timetable', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { timetable } = req.body;
  if (!Array.isArray(timetable)) {
    return res.status(400).json({ message: 'timetable must be an array' });
  }
  userTimetables.set(userId, timetable);
  res.json({ message: 'Timetable saved' });
});

router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const timetable = userTimetables.get(userId) || [];
    const now = new Date();
    const upcomingClass = timetable
      .map((c) => ({ ...c, start: new Date(c.startTime) }))
      .filter((c) => c.start > now)
      .sort((a, b) => a.start - b.start)[0];

    if (!upcomingClass) {
      return res.json({ message: 'No upcoming classes', trips: [] });
    }

    const windowStart = new Date(upcomingClass.start.getTime() - 40 * 60000);
    const windowEnd = new Date(upcomingClass.start.getTime() - 10 * 60000);

    const trips = await Trip.find({
      startTime: { $gte: windowStart, $lte: windowEnd },
    })
      .populate('route')
      .populate('bus')
      .sort('startTime');

    res.json({ class: upcomingClass, trips });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get recommendations' });
  }
});

module.exports = router;
