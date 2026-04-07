# Full Project File Map

This file lists all major files needed for the Online Campus Bus Booking System and where each responsibility should live.

## Root
- README.md
- MASTER_PROMPT_ONLINE_CAMPUS_BUS_BOOKING.md
- FULL_PROJECT_FILE_MAP.md
- package.json

## Frontend (Vite + React)
- frontend/package.json
- frontend/index.html
- frontend/src/main.jsx
- frontend/src/App.jsx
- frontend/src/index.css
- frontend/src/firebase.js

### Frontend Components
- frontend/src/components/Login.jsx
- frontend/src/components/Dashboard.jsx
- frontend/src/components/BusSelection.jsx (optional split)
- frontend/src/components/SeatBooking.jsx (optional split)
- frontend/src/components/BookingConfirmation.jsx (optional split)
- frontend/src/components/RouteTracking.jsx (optional split)
- frontend/src/components/MyBooking.jsx (bonus)

### Frontend Data/Services
- frontend/src/data/campusBuses.js
- frontend/src/services/api.js (if backend API used)

## Backend (Optional when using full Firebase-first mode)
- backend/index.js
- backend/routes/*.js
- backend/models/*.js

## Firebase Recommended Files
- firebase/firestore.rules
- firebase/firestore.indexes.json
- frontend/.env.example

## Functional Coverage Checklist
- Google login
- Dashboard profile
- Bus cards (BIT01-BIT05)
- 50-seat grid
- Seat state colors (available/selected/booked)
- Confirm booking transaction
- Real-time seat updates
- Booking confirmation page
- Route tracking details
- Edge-case handling (double booking)

## Suggested Firestore Collections
- buses
- bookings

## Minimal Fields
### buses/{busId}
- id
- name
- route
- fromCity
- toCity
- totalSeats
- seats (map)
- updatedAt

### bookings/{bookingId}
- userId
- userName
- email
- busId
- busName
- seatNumber
- route
- status
- createdAt

## Suggested Implementation Order
1. Firebase auth and config
2. Dashboard and profile state
3. Bus selection UI
4. Seat grid + seat status rendering
5. Firestore transaction booking
6. Realtime listener sync
7. Confirmation and tracking
8. Bonus pages (My Booking, Cancel, Admin)
