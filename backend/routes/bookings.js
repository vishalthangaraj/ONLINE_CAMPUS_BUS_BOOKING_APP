const express = require('express');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const Attendance = require('../models/Attendance');
const { authMiddleware } = require('../middleware/auth');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getCrowdTag(occupancyRatio) {
  if (occupancyRatio >= 0.8) return 'usually_crowded';
  if (occupancyRatio <= 0.3) return 'usually_empty';
  return 'normal';
}

module.exports = (io) => {
  const router = express.Router();

  router.get('/trip/:tripId/seat-map', authMiddleware, async (req, res) => {
    try {
      const { tripId } = req.params;
      const trip = await Trip.findById(tripId);
      if (!trip) return res.status(404).json({ message: 'Trip not found' });

      const bookings = await Booking.find({ trip: tripId, status: { $ne: 'cancelled' } });
      const bookedSeats = bookings.filter((b) => b.status === 'confirmed').map((b) => b.seatNumber);
      const reservedSeats = bookings.filter((b) => b.status === 'waitlisted').map((b) => b.seatNumber);
      const occupancyRatio = trip.capacity ? trip.bookedCount / trip.capacity : 0;

      const now = Date.now();
      const start = new Date(trip.startTime).getTime();
      const diffMin = Math.max(0, Math.round((start - now) / 60000));
      let etaMessage = 'On time';
      if (diffMin <= 3) etaMessage = 'Arriving in 3 minutes';
      else if (diffMin <= 10) etaMessage = `Arriving in ${diffMin} minutes`;
      else etaMessage = 'Scheduled later today';

      res.json({
        tripId,
        capacity: trip.capacity,
        bookedSeats,
        reservedSeats,
        bookedCount: trip.bookedCount,
        crowdTag: getCrowdTag(occupancyRatio),
        etaMessage,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to load seat map' });
    }
  });

  router.post('/', authMiddleware, async (req, res) => {
    try {
      const { tripId, seatNumbers } = req.body;
      const userId = req.user.id;
      if (!tripId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
        return res.status(400).json({ message: 'tripId and seatNumbers required' });
      }

      const trip = await Trip.findById(tripId);
      if (!trip) return res.status(404).json({ message: 'Trip not found' });

      const role = req.user.role || 'student';
      const isStudent = role === 'student';

      if (isStudent) {
        // Enforce: one seat per student per day (across all buses/trips)
        const tripDayStart = startOfDay(trip.startTime);
        const tripDayEnd = new Date(tripDayStart.getTime() + 24 * 60 * 60 * 1000);
        const tripsSameDay = await Trip.find({
          startTime: { $gte: tripDayStart, $lt: tripDayEnd },
        }).select('_id');
        const tripIdsSameDay = tripsSameDay.map((t) => t._id);

        const existingAnyToday = await Booking.findOne({
          user: userId,
          trip: { $in: tripIdsSameDay },
          status: { $ne: 'cancelled' },
        }).select('_id');
        if (existingAnyToday) {
          return res.status(400).json({ message: 'You already booked a seat for today' });
        }
      }

      // Prevent one user from booking more than one seat on the same trip
      const existingForUser = await Booking.findOne({
        user: userId,
        trip: tripId,
        status: { $ne: 'cancelled' },
      });
      if (existingForUser) {
        return res.status(400).json({ message: 'You already booked a seat for this trip' });
      }

      const existingBookings = await Booking.find({
        trip: tripId,
        seatNumber: { $in: seatNumbers },
        status: { $ne: 'cancelled' },
      });
      const alreadyBooked = new Set(existingBookings.map((b) => b.seatNumber));

      const availableSeats = seatNumbers.filter((s) => !alreadyBooked.has(s));
      const remainingCapacity = Math.max(0, trip.capacity - trip.bookedCount);
      const confirmSeats = availableSeats.slice(0, remainingCapacity);
      const waitlistSeats = availableSeats.slice(remainingCapacity);

      const confirmedSeatNumbers = [];
      const waitlistedSeatNumbers = [];

      for (const seat of confirmSeats) {
        await Booking.create({
          user: userId,
          trip: tripId,
          seatNumber: seat,
          status: 'confirmed',
        });
        confirmedSeatNumbers.push(seat);
      }

      for (const seat of waitlistSeats) {
        await Booking.create({
          user: userId,
          trip: tripId,
          seatNumber: seat,
          status: 'waitlisted',
        });
        waitlistedSeatNumbers.push(seat);
      }

      trip.bookedCount += confirmedSeatNumbers.length;
      await trip.save();

      // Mark attendance as Present for this user on trip date if at least one seat confirmed
      if (confirmedSeatNumbers.length > 0) {
        const tripDay = new Date(trip.startTime);
        tripDay.setHours(0, 0, 0, 0);
        await Attendance.findOneAndUpdate(
          { user: userId, date: tripDay },
          { $set: { status: 'Present' } },
          { upsert: true, new: true }
        );
      }

      io.to(`trip:${tripId}`).emit('seatUpdate', {
        tripId,
        confirmedSeats: confirmedSeatNumbers,
        waitlistedSeats: waitlistedSeatNumbers,
      });

      res.status(201).json({
        message: 'Booking processed',
        confirmedSeats: confirmedSeatNumbers,
        waitlistedSeats: waitlistedSeatNumbers,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Booking failed' });
    }
  });

  // Get user's bookings
  router.get('/user', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const bookings = await Booking.find({ user: userId })
        .populate('trip')
        .populate('user', 'name email')
        .sort({ createdAt: -1 });
      res.json(bookings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  });

  // Get booking by ID
  router.get('/:bookingId', authMiddleware, async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.bookingId)
        .populate('trip')
        .populate('user', 'name email');
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      res.json(booking);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to fetch booking' });
    }
  });

  // Cancel booking
  router.post('/:bookingId/cancel', authMiddleware, async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      if (booking.status === 'cancelled') {
        return res.status(400).json({ message: 'Booking already cancelled' });
      }

      booking.status = 'cancelled';
      await booking.save();

      // Update trip booked count
      if (booking.status === 'confirmed') {
        const trip = await Trip.findById(booking.trip);
        if (trip && trip.bookedCount > 0) {
          trip.bookedCount -= 1;
          await trip.save();
        }
      }

      io.to(`trip:${booking.trip}`).emit('seatUpdate', {
        tripId: booking.trip,
        cancelledSeats: [booking.seatNumber],
      });

      res.json({ message: 'Booking cancelled', booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to cancel booking' });
    }
  });

  return router;
};
