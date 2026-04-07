const express = require('express');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Check if user is admin middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  next();
};

// Get dashboard statistics
router.get('/stats', authMiddleware, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments({ status: 'confirmed' });
    const totalBuses = await Bus.countDocuments({ isActive: true });
    const occupancyRate = Math.round((totalBookings / (totalBuses * 60)) * 100) || 0;

    res.json({
      totalUsers,
      totalBookings,
      totalBuses,
      occupancyRate,
      revenue: totalBookings * 50, // Assuming ₹50 per seat
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Get all buses (admin)
router.get('/buses', authMiddleware, isAdmin, async (req, res) => {
  try {
    const buses = await Bus.find()
      .populate('route')
      .select('-__v')
      .sort({ createdAt: -1 });
    res.json(buses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch buses' });
  }
});

// Get all bookings (admin)
router.get('/bookings', authMiddleware, isAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('trip')
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get all users (admin)
router.get('/users', authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash -__v')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

module.exports = router;
