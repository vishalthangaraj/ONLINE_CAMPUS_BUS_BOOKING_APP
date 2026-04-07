const express = require('express');
const Route = require('../models/Route');
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const routes = await Route.find({ isActive: true }).sort('name');
  res.json(routes);
});

router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { name, code, stops } = req.body;
    const route = await Route.create({ name, code, stops });
    res.status(201).json(route);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create route' });
  }
});

router.post('/:routeId/trips', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { routeId } = req.params;
    const { busId, startTime, capacity } = req.body;
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(400).json({ message: 'Invalid bus' });
    }

    const trip = await Trip.create({
      route: routeId,
      bus: busId,
      startTime,
      capacity: capacity || bus.capacity,
    });

    res.status(201).json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create trip' });
  }
});

router.get('/:routeId/trips', authMiddleware, async (req, res) => {
  try {
    const { routeId } = req.params;
    const now = new Date();
    const trips = await Trip.find({
      route: routeId,
      startTime: { $gte: new Date(now.getTime() - 60 * 60 * 1000) },
    })
      .populate('bus')
      .sort('startTime');

    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load trips' });
  }
});

module.exports = router;
