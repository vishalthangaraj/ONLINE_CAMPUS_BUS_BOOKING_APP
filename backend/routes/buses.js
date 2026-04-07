const express = require('express');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const Route = require('../models/Route');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all buses
router.get('/', async (req, res) => {
  try {
    const buses = await Bus.find({ isActive: true })
      .populate('route')
      .select('-__v');
    res.json(buses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch buses' });
  }
});

// Get bus by ID
router.get('/:busId', async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId)
      .populate('route')
      .select('-__v');
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    res.json(bus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch bus' });
  }
});

// Create bus (admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { plateNumber, capacity, routeId } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const bus = new Bus({
      plateNumber,
      capacity: capacity || 60,
      route: routeId,
    });

    await bus.save();
    await bus.populate('route');
    res.status(201).json(bus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create bus' });
  }
});

// Update bus (admin only)
router.put('/:busId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { capacity, isActive } = req.body;
    const bus = await Bus.findByIdAndUpdate(
      req.params.busId,
      { capacity, isActive },
      { new: true }
    ).populate('route');

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    res.json(bus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update bus' });
  }
});

module.exports = router;
