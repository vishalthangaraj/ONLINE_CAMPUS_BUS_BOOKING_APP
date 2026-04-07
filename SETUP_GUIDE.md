# Campus Bus Seat Booking System - Complete Setup Guide

## 🎉 System Overview

A modern, full-stack campus bus seat booking application with:
- **React Frontend** with real-time seat selection
- **Express.js Backend** with MongoDB
- **JWT Authentication** with Google Sign-In
- **Socket.IO** for real-time seat updates
- **Admin Dashboard** for system management

---

## 📁 Project Structure

### Frontend (`frontend/`)
```
src/
├── components/
│   ├── Dashboard.jsx           # Main dashboard with bus list
│   ├── SeatBooking.jsx         # Seat selection interface
│   ├── SeatMap.jsx             # Seat grid layout 6x10
│   ├── PassengerModal.jsx      # Multi-step passenger form
│   ├── BookingHistory.jsx      # User's previous bookings
│   ├── AdminDashboard.jsx      # Admin panel
│   ├── Header.jsx              # Navigation header
│   └── Login.jsx               # Google OAuth login
├── services/
│   └── api.js                  # Axios API client
├── firebase.js                 # Firebase config
├── main.jsx                    # React entry point
└── index.css                   # Tailwind CSS styles
```

### Backend (`backend/`)
```
routes/
├── auth.js                     # Authentication
├── bookings.js                 # Booking operations  ✨ UPDATED
├── buses.js                    # Bus management      ✨ NEW
├── trips.js                    # Trip management     ✨ NEW
├── admin.js                    # Admin endpoints     ✨ NEW
├── routes.js                   # Route management
└── ... (existing routes)

models/
├── Booking.js                  # Booking schema     ✨ UPDATED
├── Bus.js
├── Trip.js
├── User.js
└── ... (existing models)

middleware/
└── auth.js                     # JWT verification
```

---

## 🚀 Installation & Setup

### Step 1: Install Dependencies

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### Step 2: Environment Variables

**Backend (`backend/.env`):**
```env
PORT=4000
HOST=0.0.0.0
MONGO_URI=mongodb://127.0.0.1:27017
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

**Frontend (`frontend/.env.local`):**
```env
VITE_API_URL=/api
VITE_WS_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=your_firebase_key
```

### Step 3: Start Development Servers

**Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:4000
```

**Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

---

## 🎯 Key Features Implemented

### ✅ User Dashboard
- Displays available campus buses
- Quick stats (My Bookings, Routes, Available Buses)
- Bus cards with real-time seat availability
- One-click access to seat booking

### ✅ Seat Booking Interface
**Layout:**
- **Left Panel:** Booking details, legend, counters, price summary
- **Right Panel:** Interactive seat map

**Seat States:**
- 🟩 Available (light grey) - clickable
- 🟩 Selected (green) - user selected
- 🟩 Occupied (dark grey) - booked/reserved
- 🟩 Premium (gold) - extra comfort seats
- 🟩 Booked (red) - confirmed by other users

**Seat Grid:**
- 6 seats per row (A B C | D E F)
- Aisle between C and D
- 10 rows = 60 total seats
- Seat letters with passenger initials when booked

### ✅ Passenger Details Modal
- Multi-step form for each selected seat
- Fields: Name, Age, Gender
- Progress bar showing completion
- Navigation between seats
- Live preview of other passengers

### ✅ Booking Confirmation
- Selected seats → RED (booked)
- Automatic seat color updates
- Real-time updates via Socket.IO
- Booking ID generated
- Seats locked for other users

### ✅ Booking History
- All user bookings listed
- Status indicators (Confirmed, Waitlisted, Cancelled)
- Booking ID, route, seats, date
- Cancel booking option
- View booking details

### ✅ Admin Dashboard
**Statistics:**
- Total users
- Total bookings (revenue ₹50/seat)
- Total buses
- Occupancy rate

**Management Tabs:**
- Statistics view
- Buses list & management
- All bookings view with filters

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth login

### Buses
- `GET /api/buses` - List all buses
- `GET /api/buses/:busId` - Get bus details
- `POST /api/buses` - Create bus (admin)
- `PUT /api/buses/:busId` - Update bus (admin)

### Trips
- `GET /api/trips` - List all trips
- `GET /api/trips/bus/:busId` - Get trips for bus
- `GET /api/trips/:tripId` - Get trip details
- `POST /api/trips` - Create trip (admin)

### Bookings
- `GET /api/bookings/trip/:tripId/seat-map` - Get seat map
- `POST /api/bookings` - Create booking
- `GET /api/bookings/user` - Get user bookings
- `GET /api/bookings/:bookingId` - Get booking details
- `POST /api/bookings/:bookingId/cancel` - Cancel booking

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/buses` - All buses
- `GET /api/admin/bookings` - All bookings
- `GET /api/admin/users` - All users

---

## 💾 Database Schema

### Booking (Updated)
```javascript
{
  user: ObjectId,           // Reference to User
  trip: ObjectId,           // Reference to Trip
  seatNumber: Number,       // Single seat
  passengers: [{
    seatNumber: Number,
    name: String,           // Passenger name
    age: Number,           // Passenger age
    gender: String         // M, F, O
  }],
  status: String,          // confirmed, waitlisted, cancelled
  createdAt: Date,
  updatedAt: Date
}
```

### Trip
```javascript
{
  route: ObjectId,
  bus: ObjectId,
  startTime: Date,
  endTime: Date,
  status: String,          // scheduled, in_progress, completed, cancelled
  capacity: Number,        // Total seats
  bookedCount: Number      // Booked seats
}
```

### Bus
```javascript
{
  plateNumber: String,
  capacity: Number,        // 60 (default)
  route: ObjectId,
  isActive: Boolean
}
```

---

## 🎨 Design Color Scheme

| State | Color | Usage |
|-------|-------|-------|
| Available | #E5E7EB (light grey) | Empty seats |
| Selected | #10B981 (green) | User selected |
| Occupied | #6B7280 (dark grey) | Booked by others |
| Premium | #FBBF24 (gold) | Extra comfort |
| Booked | #EF4444 (red) | Confirmed booking |
| Primary | #2563EB (blue) | Buttons, links |

---

## 🔐 Security Features

1. **JWT Authentication**
   - Tokens stored in localStorage
   - Verified on every API request
   - Role-based access control

2. **Password Security**
   - bcrypt hashing for passwords
   - Password verification on login

3. **Authorization**
   - Admin-only endpoints protected
   - Users can only access own bookings
   - Booking cancellation restricted to owner

---

## 🔄 Real-Time Features

### Socket.IO Implementation
- **Event:** `seatUpdate`
- **Triggered:** When booking confirmed
- **Data:** Trip ID, confirmed seats, waitlisted seats
- **Action:** Other users see seats become occupied instantly

---

## 🧪 Testing the System

### Test Scenario 1: Complete Booking Flow
1. Login with Google
2. Go to Dashboard
3. Select a bus and click "View Seats"
4. Click seats (multiple allowed)
5. Fill passenger details in modal
6. Confirm booking
7. Check "My Bookings"
8. View booking details

### Test Scenario 2: Real-Time Updates
1. Open two browser windows
2. Log in with different accounts
3. Both select same bus
4. First user books seat
5. Verify second user sees seat marked as occupied

### Test Scenario 3: Admin Functions
1. Login as admin user
2. Go to `/admin`
3. View statistics
4. Check buses list
5. Check bookings table

---

## 📋 TODO / Future Enhancements

- [ ] Email notifications on booking
- [ ] QR code generation for tickets
- [ ] Receipt download (PDF)
- [ ] Refund/cancellation policy
- [ ] Rating and review system
- [ ] Driver information display
- [ ] Live bus tracking
- [ ] Payment integration
- [ ] Mobile app (React Native)
- [ ] SMS alerts

---

## 🐛 Troubleshooting

### Issue: "Cannot GET /api/buses"
**Solution:** Ensure backend is running on port 4000 and buses route is imported in `index.js`

### Issue: Socket.IO connection fails
**Solution:** Check CORS settings in backend, ensure VITE_WS_URL is correct

### Issue: "Unauthorized" error on admin endpoints
**Solution:** Check user role in JWT token, ensure role field exists in User model

### Issue: Seats not updating in real-time
**Solution:** Open browser dev tools, check Socket.IO connection tab, verify event emissions

---

## 📚 Key Technologies

- **Frontend:** React 18, React Router 6, Tailwind CSS, Axios, Socket.IO Client
- **Backend:** Node.js, Express.js, MongoDB, Mongoose, Socket.IO
- **Auth:** Firebase Authentication, JWT, bcrypt
- **Build:** Vite, PostCSS

---

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [MongoDB Manual](https://docs.mongodb.com)
- [Socket.IO Docs](https://socket.io/docs)
- [Tailwind CSS](https://tailwindcss.com)

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend logs for errors
3. Open browser console for frontend errors
4. Check MongoDB connection status

---

## ✨ Summary of Changes

| File | Status | Changes |
|------|--------|---------|
| frontend/package.json | ✅ Updated | Added React, Router, Axios, Tailwind |
| frontend/vite.config.js | ✅ Updated | Added React plugin |
| frontend/tailwind.config.js | ✨ New | Tailwind configuration |
| frontend/postcss.config.js | ✨ New | PostCSS configuration |
| frontend/src/main.jsx | ✨ New | React entry point |
| frontend/src/App.jsx | ✨ New | Router setup  |
| frontend/src/index.css | ✨ New | Global styles |
| frontend/src/services/api.js | ✨ New | API client |
| frontend/src/components/* | ✨ New | 7 React components |
| backend/routes/buses.js | ✨ New | Bus endpoint |
| backend/routes/trips.js | ✨ New | Trip endpoints |
| backend/routes/admin.js | ✨ New | Admin endpoints |
| backend/routes/bookings.js | ✅ Updated | Added GET /user, cancel, etc |
| backend/models/Booking.js | ✅ Updated | Added passenger details |
| backend/index.js | ✅ Updated | Added new routes |

---

**Total implementation time:** ~1-2 hours for complete system setup

**Ready to launch!** 🚀
