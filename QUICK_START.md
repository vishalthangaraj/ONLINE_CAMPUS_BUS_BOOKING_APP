# Campus Bus Booking System - Quick Start Guide

## First Time Setup (5 minutes)

### 1. Install Dependencies
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure Environment
**Backend (.env)**
```
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017
JWT_SECRET=your_secret_key
```

### 3. Start Services
**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Open Browser
```
http://localhost:5173
```

### 5. Login
- Click "Sign in with Google"
- Complete Google auth flow
- Done! ✅

---

## Core Workflows

### 👤 User Booking Workflow
1. **Dashboard** → View available buses
2. **Select Bus** → Click "View Seats"
3. **Choose Seats** → Click green available seats
4. **Fill Details** → Enter name, age, gender for each seat
5. **Confirm** → Seats turn red (booked)
6. **View Booking** → Go to "My Bookings"

### 🛠️ Admin Workflow
1. Log in as admin user
2. Navigate to `/admin` path
3. View dashboard statistics
4. Manage buses and bookings

---

## Key Components Breakdown

### SeatBooking.jsx (Main Page)
- Split layout: left panel + right panel
- Left: Booking details, price calculation
- Right: Interactive seat map
- Modal for passenger details

![Seat Booking Flow]
User clicks seat → Seat turns green → 
User confirms → Modal opens → 
User enters details → Booking confirmed → 
Seat turns red

### SeatMap.jsx (Seat Grid)
- 10 rows × 6 seats per row
- A B C | AISLE | D E F format
- Passenger initials shown on booked seats
- Hover effects and smooth transitions

### PassengerModal Passenger Details (Multi-Step Form)
- One step per selected seat
- Progress bar showing completion
- Fields: Name (required), Age, Gender (optional)
- Navigation: Previous/Next buttons

---

## API Response Examples

### Get Seat Map
```bash
GET /api/bookings/trip/:tripId/seat-map
```
Response:
```json
{
  "tripId": "...",
  "capacity": 60,
  "bookedSeats": [1, 5, 10],
  "reservedSeats": [2, 8],
  "bookedCount": 3,
  "etaMessage": "Arriving in 5 minutes"
}
```

### Create Booking
```bash
POST /api/bookings
Content-Type: application/json

{
  "tripId": "...",
  "seatNumbers": [7, 8, 11],
  "passengers": [
    { "seatNumber": 7, "name": "Vishal", "age": 20, "gender": "M" },
    { "seatNumber": 8, "name": "Arun", "age": 21, "gender": "M" },
    { "seatNumber": 11, "name": "Karthik", "age": 19, "gender": "M" }
  ]
}
```

Response:
```json
{
  "message": "Booking processed",
  "confirmedSeats": [7, 8, 11],
  "waitlistedSeats": []
}
```

---

## Styling & Colors

### Tailwind CSS Color System
```css
Primary: bg-blue-600    /* Main buttons */
Success: bg-green-500   /* Selected seats */
Danger: bg-red-600      /* Booked seats */
Warning: bg-yellow-400  /* Premium seats */
Dark: bg-gray-600       /* Occupied seats */
```

### Quick CSS Classes
```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg">
  Button
</button>

<div className="bg-white rounded-lg shadow-soft p-6">
  Card content
</div>
```

---

## Component Props Overview

### SeatBooking.jsx → SeatMap.jsx
```jsx
<SeatMap
  bookedSeats={{seatNumber: {name, status}}}
  selectedSeats={[1, 5, 10]}
  onSeatClick={(seatNumber) => {}}
  totalSeats={60}
/>
```

### SeatBooking.jsx → PassengerModal.jsx
```jsx
<PassengerModal
  selectedSeats={[7, 8, 11]}
  onClose={() => {}}
  onSubmit={(passengerDetails) => {}}
  loading={false}
/>
```

---

## Real-Time Updates with Socket.IO

```javascript
// Client listening
socket.on('seatUpdate', (data) => {
  console.log('Seat update:', data)
  // data.confirmedSeats - newly booked seats
  // data.tripId - which trip
})

// Server emitting
io.to(`trip:${tripId}`).emit('seatUpdate', {
  tripId: tripId,
  confirmedSeats: [7, 8, 11],
  waitlistedSeats: []
})
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 404 on /api/buses | Ensure backend started, route imported |
| Socket connection fails | Check CORS, WS URL correct |
| "Unauthorized" on admin | User role must be 'admin' in JWT |
| Seats not updating | Check Socket.IO connection in DevTools |
| Tailwind not working | Run `npm run build` for production |
| Google auth fails | Check Firebase config, credentials valid |

---

## File Structure Reference

```
campus_bus_booking_app/
├── frontend/
│   ├── src/
│   │   ├── components/     ← React components live here
│   │   ├── services/       ← API calls
│   │   ├── App.jsx         ← Router setup
│   │   └── main.jsx        ← Entry point
│   ├── index.html          ← HTML template
│   ├── vite.config.js      ← Build config
│   └── package.json        ← Dependencies
│
├── backend/
│   ├── routes/             ← API endpoints
│   ├── models/             ← MongoDB schemas
│   ├── middleware/         ← Auth, error handling
│   ├── index.js            ← Server entry point
│   └── package.json        ← Dependencies
│
└── SETUP_GUIDE.md          ← This file
```

---

## Environment Variables Checklist

```
Frontend (.env.local):
☐ VITE_API_URL=/api
☐ VITE_WS_URL=http://localhost:4000

Backend (.env):
☐ PORT=4000
☐ MONGO_URI=mongodb://127.0.0.1:27017
☐ JWT_SECRET=your_secret_key
☐ NODE_ENV=development
```

---

## Deployment Checklist

Before going to production:
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Configure CORS for production URLs
- [ ] Use secure MongoDB connection
- [ ] Enable rate limiting on API
- [ ] Create admin user
- [ ] Test all workflows
- [ ] Set up error logging
- [ ] Enable authentication on all api routes
- [ ] Test Socket.IO connections

---

**Everything ready? Boot it up and start booking! 🚀**

For detailed setup: See `SETUP_GUIDE.md`
