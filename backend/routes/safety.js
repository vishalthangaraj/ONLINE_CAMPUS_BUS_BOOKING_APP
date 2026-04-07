const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const Trip = require('../models/Trip');

const router = express.Router();

const sharedTrips = new Map();
const panicEvents = [];

router.post('/share', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tripId, trustedContact } = req.body;
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const token = `${tripId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sharedTrips.set(token, {
      userId,
      tripId,
      trustedContact,
      createdAt: new Date(),
    });

    res.json({
      shareToken: token,
      shareUrl: `/share/${token}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create share link' });
  }
});

router.post('/panic', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tripId, location } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const event = {
      userId,
      tripId,
      location,
      createdAt: new Date(),
    };
    panicEvents.push(event);

    res.json({ message: 'Panic alert sent to campus security (mock)', event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send panic alert' });
  }
});

module.exports = router;
