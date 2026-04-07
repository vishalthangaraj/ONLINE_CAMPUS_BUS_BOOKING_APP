const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');

module.exports = (io) => {
  const router = express.Router();

  // Initialize buses
  const initialBuses = [
    { _id: 'BITNO1', name: 'Bus BITNO1', fromCity: 'Tiruppur', toCity: 'College', route: 'Tiruppur -> College', totalSeats: 45, seats: {} },
    { _id: 'BITNO2', name: 'Bus BITNO2', fromCity: 'Salem', toCity: 'College', route: 'Salem -> College', totalSeats: 45, seats: {} },
    { _id: 'BITNO3', name: 'Bus BITNO3', fromCity: 'Erode', toCity: 'College', route: 'Erode -> College', totalSeats: 45, seats: {} },
    { _id: 'BITNO4', name: 'Bus BITNO4', fromCity: 'Gobi', toCity: 'College', route: 'Gobi -> College', totalSeats: 45, seats: {} },
    { _id: 'BITNO5', name: 'Bus BITNO5', fromCity: 'Coimbatore', toCity: 'College', route: 'Coimbatore -> College', totalSeats: 45, seats: {} },
    { _id: 'BITNO6', name: 'Bus BITNO6', fromCity: 'Puliyampatti', toCity: 'College', route: 'Puliyampatti -> College', totalSeats: 45, seats: {} },
  ];

  router.post('/seed', async (req, res) => {
    try {
      const col = mongoose.connection.db.collection('shim_buses');
      const count = await col.countDocuments();
      if (count === 0) {
        await col.insertMany(initialBuses);
      }
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/buses', async (req, res) => {
    try {
      const buses = await mongoose.connection.db.collection('shim_buses').find({}).toArray();
      res.json(buses);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/bookings/user', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.json([]);
    try {
      const bookings = await mongoose.connection.db.collection('shim_bookings').find({ userId }).sort({ createdAtTs: -1 }).toArray();
      res.json(bookings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/bookings', async (req, res) => {
    try {
      const { userId, userName, email, busId, busName, route, fromCity, toCity, seatNumber, travelDate, departureTime, status } = req.body;
      const selectedSeats = seatNumber.split(', ');

      const col = mongoose.connection.db.collection('shim_buses');
      const bus = await col.findOne({ _id: busId });
      if (!bus) return res.status(404).json({ error: 'Bus not found' });

      // Check seats
      const seats = bus.seats || {};
      for (const seat of selectedSeats) {
        if (seats[seat] && seats[seat].status === 'booked') {
          return res.status(400).json({ error: `Seat ${seat} is already booked` });
        }
      }

      for (const seat of selectedSeats) {
        seats[seat] = { status: 'booked', bookedBy: userId, bookedEmail: email };
      }

      await col.updateOne({ _id: busId }, { $set: { seats } });

      const newBooking = {
        _id: `booking-${Date.now()}`,
        userId,
        userName,
        email,
        busId,
        busName,
        route,
        fromCity,
        toCity,
        seatNumber,
        travelDate,
        departureTime,
        status,
        createdAtTs: Date.now()
      };

      await mongoose.connection.db.collection('shim_bookings').insertOne(newBooking);

      // Emit socket event
      const updatedBuses = await col.find({}).toArray();
      io.emit('buses-update', updatedBuses);

      res.json({ success: true, booking: newBooking });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mock State for a specific day
  router.get('/mock-state/:date', async (req, res) => {
     try {
       const doc = await mongoose.connection.db.collection('shim_mock_state').findOne({ _id: req.params.date });
       res.json(doc ? doc.seats : {});
     } catch (err) {
       res.status(500).json({ error: err.message });
     }
  });

  router.post('/mock-state/:date', async (req, res) => {
    try {
      const { busId, selectedSeats } = req.body;
      const dateId = req.params.date;
      const col = mongoose.connection.db.collection('shim_mock_state');
      
      const doc = await col.findOne({ _id: dateId });
      const seats = doc ? doc.seats : {};
      
      const currentList = seats[busId] || [];
      for (const s of selectedSeats) {
         if (currentList.includes(s)) return res.status(400).json({ error: `Seat ${s} already booked in mock` });
      }

      seats[busId] = [...currentList, ...selectedSeats];
      await col.updateOne({ _id: dateId }, { $set: { seats } }, { upsert: true });

      io.emit('mock-state-update', { date: dateId, seats });
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
