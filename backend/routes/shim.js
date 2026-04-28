const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/auth');

module.exports = (io) => {
  const router = express.Router();

  // Initialize buses with the updated 20 BIT routes
  const initialBuses = [
    { _id: 'BIT1', name: 'Bus BIT1', fromCity: 'Somanur', toCity: 'College', route: 'Somanur Bus Stand → Punjai Puliyampatti', totalSeats: 45, seats: {} },
    { _id: 'BIT2', name: 'Bus BIT2', fromCity: 'S R Nagar', toCity: 'College', route: 'Tiruppur (Kumaran College) Route', totalSeats: 45, seats: {} },
    { _id: 'BIT3', name: 'Bus BIT3', fromCity: 'Nataraj Theatre', toCity: 'College', route: 'Tiruppur (Old Bus Stand) Route', totalSeats: 45, seats: {} },
    { _id: 'BIT4', name: 'Bus BIT4', fromCity: 'Perumanallur', toCity: 'College', route: 'Tiruppur (New Bus Stand) Route', totalSeats: 45, seats: {} },
    { _id: 'BIT5', name: 'Bus BIT5', fromCity: 'Avinashi', toCity: 'College', route: 'Avinashi Route', totalSeats: 45, seats: {} },
    { _id: 'BIT6', name: 'Bus BIT6', fromCity: 'Kovilpalayam', toCity: 'College', route: 'Saravanampatti / Kovilpalayam / Annur Route', totalSeats: 45, seats: {} },
    { _id: 'BIT7', name: 'Bus BIT7', fromCity: 'Periyanaickenpalayam', toCity: 'College', route: 'Thudiyalur / Periyanaickenpalayam Route', totalSeats: 45, seats: {} },
    { _id: 'BIT8', name: 'Bus BIT8', fromCity: 'Mettupalayam', toCity: 'College', route: 'Karamadai Route', totalSeats: 45, seats: {} },
    { _id: 'BIT9', name: 'Bus BIT9', fromCity: 'Alankombu', toCity: 'College', route: 'Mettupalayam / Sirumugai Route', totalSeats: 45, seats: {} },
    { _id: 'BIT10', name: 'Bus BIT10', fromCity: 'Chithode', toCity: 'College', route: 'Erode / Chithode / Kavindapadi Route', totalSeats: 45, seats: {} },
    { _id: 'BIT11', name: 'Bus BIT11', fromCity: 'Thudupathi', toCity: 'College', route: 'Perundurai Route', totalSeats: 45, seats: {} },
    { _id: 'BIT12', name: 'Bus BIT12', fromCity: 'Komarapalayam', toCity: 'College', route: 'Komarapalayam / Bhavani Route', totalSeats: 45, seats: {} },
    { _id: 'BIT13', name: 'Bus BIT13', fromCity: 'Gandhi Nagar', toCity: 'College', route: 'Sathyamangalam Town Route', totalSeats: 45, seats: {} },
    { _id: 'BIT14', name: 'Bus BIT14', fromCity: 'Gobi', toCity: 'College', route: 'Gobichettipalayam Local', totalSeats: 45, seats: {} },
    { _id: 'BIT15', name: 'Bus BIT15', fromCity: 'Gandhipuram', toCity: 'College', route: 'Coimbatore Expressway', totalSeats: 45, seats: {} },
    { _id: 'BIT16', name: 'Bus BIT16', fromCity: 'Anthiyur', toCity: 'College', route: 'Anthiyur via Gobi', totalSeats: 45, seats: {} },
    { _id: 'BIT17', name: 'Bus BIT17', fromCity: 'Kunnathur', toCity: 'College', route: 'Kunnathur Route', totalSeats: 45, seats: {} },
    { _id: 'BIT18', name: 'Bus BIT18', fromCity: 'Bhavanisagar', toCity: 'College', route: 'Bhavanisagar Shuttle', totalSeats: 45, seats: {} },
    { _id: 'BIT19', name: 'Bus BIT19', fromCity: 'Sirumugai', toCity: 'College', route: 'Sirumugai Express', totalSeats: 45, seats: {} },
    { _id: 'BIT20', name: 'Bus BIT20', fromCity: 'Bannari Amman Temple', toCity: 'College', route: 'Bannari Temple Shuttle', totalSeats: 45, seats: {} },
  ];

  router.post('/seed', async (req, res) => {
    try {
      const col = mongoose.connection.db.collection('shim_buses');
      await col.deleteMany({}); // Clear existing to ensure update
      await col.insertMany(initialBuses);
      res.json({ success: true, count: initialBuses.length });
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
      const selectedSeats = String(seatNumber).split(', ');

      const col = mongoose.connection.db.collection('shim_buses');
      const bus = await col.findOne({ _id: String(busId) });
      if (!bus) return res.status(404).json({ error: `Bus not found: ${busId}` });

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

      const cancellationsToday = await mongoose.connection.db.collection('shim_bookings').countDocuments({
        userId,
        travelDate,
        status: 'cancelled'
      });
      const cancelDisabled = cancellationsToday >= 2;

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
        cancelDisabled,
        cancellationSequence: cancellationsToday,
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

  router.post('/bookings/cancel/:bookingId', async (req, res) => {
    try {
      const { bookingId } = req.params;
      const bookingsCol = mongoose.connection.db.collection('shim_bookings');
      const busesCol = mongoose.connection.db.collection('shim_buses');
      const mockCol = mongoose.connection.db.collection('shim_mock_state');

      const booking = await bookingsCol.findOne({ _id: bookingId });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.status === 'cancelled') return res.status(400).json({ error: 'Booking already cancelled' });

      if (booking.cancelDisabled) {
        return res.status(403).json({ error: 'Cancel option disabled permanently' });
      }

      // Count cancellations for this day
      const cancellationsToday = await bookingsCol.countDocuments({
        userId: booking.userId,
        travelDate: booking.travelDate,
        status: 'cancelled'
      });

      if (cancellationsToday >= 2) {
        return res.status(403).json({ error: 'Cancel option disabled permanently' });
      }

      // 1. Update Booking Status
      await bookingsCol.updateOne({ _id: bookingId }, { $set: { status: 'cancelled' } });

      // 2. Remove from Bus Seat Map
      const bus = await busesCol.findOne({ _id: booking.busId });
      if (bus && bus.seats) {
        const updatedSeats = { ...bus.seats };
        const seatsToRemove = booking.seatNumber.split(', ');
        seatsToRemove.forEach(s => {
          if (updatedSeats[s] && updatedSeats[s].bookedBy === booking.userId) {
            delete updatedSeats[s];
          }
        });
        await busesCol.updateOne({ _id: booking.busId }, { $set: { seats: updatedSeats } });
      }

      // 3. Remove from Mock State (if exists for that date)
      const mockDoc = await mockCol.findOne({ _id: booking.travelDate });
      if (mockDoc && mockDoc.seats && mockDoc.seats[booking.busId]) {
        const seatsToRemove = booking.seatNumber.split(', ');
        const currentMockSeats = mockDoc.seats[booking.busId];
        const updatedMockSeats = currentMockSeats.filter(s => !seatsToRemove.includes(s));
        
        const newSeatsObj = { ...mockDoc.seats, [booking.busId]: updatedMockSeats };
        await mockCol.updateOne({ _id: booking.travelDate }, { $set: { seats: newSeatsObj } });
        io.emit('mock-state-update', { date: booking.travelDate, seats: newSeatsObj });
      }

      // 4. Emit Global Update
      const updatedBuses = await busesCol.find({}).toArray();
      io.emit('buses-update', updatedBuses);

      let message = 'Booking cancelled successfully';
      if (cancellationsToday === 0) message = 'First cancellation used';
      else if (cancellationsToday === 1) message = 'Second cancellation completed';

      res.json({ success: true, message });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
