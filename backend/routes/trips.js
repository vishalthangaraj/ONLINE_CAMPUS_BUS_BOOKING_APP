const express = require('express');
const Trip = require('../models/Trip');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all trips
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('route')
      .populate('bus')
      .select('-__v')
      .sort({ startTime: -1 });
    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch trips' });
  }
});

// Get trips for a bus
router.get('/bus/:busId', async (req, res) => {
  try {
    const trips = await Trip.find({ bus: req.params.busId })
      .populate('route')
      .populate('bus')
      .select('-__v')
      .sort({ startTime: 1 });
    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch trips' });
  }
});

// Get trip by ID
router.get('/:tripId', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId)
      .populate('route')
      .populate('bus')
      .select('-__v');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch trip' });
  }
});

// Create trip (admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { routeId, busId, startTime, endTime, capacity } = req.body;
    const trip = new Trip({
      route: routeId,
      bus: busId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      capacity: capacity || 60,
      status: 'scheduled',
    });

    await trip.save();
    await trip.populate('route').populate('bus');
    res.status(201).json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create trip' });
  }
});

module.exports = router;
