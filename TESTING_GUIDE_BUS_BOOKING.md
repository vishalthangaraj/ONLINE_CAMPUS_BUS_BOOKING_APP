# CampusRide - Bus Booking Testing Guide

## Quick Start

### Prerequisites
- Backend running on `http://localhost:4000`
- Frontend running on `http://localhost:5177`
- Google Firebase credentials configured

### Access the Application
```
http://localhost:5177/
```

---

## Test Scenarios

### Scenario 1: Login
**Steps:**
1. Go to http://localhost:5177/
2. Click "Sign in with Google"
3. Authenticate with your Google account
4. Should redirect to Dashboard

**Expected Result:**
- ✅ Login section disappears
- ✅ Dashboard displays with welcome message
- ✅ "Welcome back, [Your Name]" shows

---

### Scenario 2: View Available Buses
**Steps:**
1. After login, stay on Dashboard
2. Scroll to "Available Buses" section
3. See the list of bus cards

**Expected Result:**
- ✅ See 6 buses (101-106)
- ✅ Each card shows:
  - Bus number
  - Route information
  - Departure time
  - Available seats
  - Occupancy percentage
  - "Select Seats" button
  
- ✅ Occupancy circle shows filled percentage

**Sample Buses:**
- Bus 101: Campus → City Center | 08:30 | 12 available
- Bus 102: Campus → Railway Station | 09:00 | 20 available
- Bus 103: Campus → Bus Stand | 09:30 | 0 available (Full)
- Bus 104: Campus → Airport | 10:00 | 30 available
- Bus 105: Campus → Hospital | 08:00 | 16 available
- Bus 106: Campus → Shopping Mall | 10:00 | 18 available

---

### Scenario 3: Expand Bus to View Time Slots
**Steps:**
1. Click on any bus card
2. Card should expand

**Expected Result:**
- ✅ Shows all time slots for that bus
- ✅ Each slot displays:
  - Departure & arrival time
  - Available seats
  - Individual "Book" button
- ✅ Example for Bus 101:
  - 08:30 - 09:00 | 12 available
  - 10:30 - 11:00 | 8 available
  - 14:30 - 15:00 | 15 available

---

### Scenario 4: Click to Book a Bus
**Steps:**
1. On Dashboard, click "Select Seats" button on any bus (with available seats)
2. Should navigate to Seat Booking page

**Expected Result:**
- ✅ Navigates to `/booking/{tripId}`
- ✅ Shows seat map on right
- ✅ Shows booking summary on left

---

### Scenario 5: View Seat Map
**Steps:**
1. On SeatBooking page, view the seat grid

**Expected Result:**
- ✅ Seats displayed in 6 columns:
  - A, B, C (left group)
  - | Aisle |
  - D, E, F (right group)
  
- ✅ Seat colors:
  - **Gray**: Available seats
  - **Green**: Currently selected
  - **Dark gray**: Already booked
  - **Yellow**: Premium seats (D, E columns)

- ✅ Row numbers on left (1-10)
- ✅ Front indicator at top

---

### Scenario 6: Select Seats
**Steps:**
1. Click on available gray seats
2. Try selecting 3 seats

**Expected Result:**
- ✅ First click selects seat (turns green)
- ✅ Second click selects another seat
- ✅ Third click shows error: "Maximum 2 seats allowed per booking"
- ✅ Selected seats appear in list on left panel
- ✅ Count updates: "Selected Seats: 2"
- ✅ Price updates: "Seats × 2" = "₹100"

---

### Scenario 7: Deselect Seats
**Steps:**
1. Click on a green (selected) seat
2. Click again

**Expected Result:**
- ✅ Seat turns back to gray
- ✅ Count decreases
- ✅ Price updates accordingly
- ✅ Seat removed from selected list

---

### Scenario 8: View Booking Summary
**Steps:**
1. Select 1-2 seats
2. Look at left panel

**Expected Result:**
- ✅ Shows route information
- ✅ Shows departure time
- ✅ Available seats counter
- ✅ Occupied seats counter
- ✅ Selected seats list
- ✅ Price breakdown:
  - Seats × [count]: ₹[amount]
  - Total: ₹[total]

---

### Scenario 9: Confirm Booking
**Steps:**
1. Select 2 seats
2. Click "Confirm Book" button

**Expected Result:**
- ✅ PassengerModal appears
- ✅ Form shows:
  - Seat number (e.g., "Seat A1")
  - Progress bar (1/2)
  - Passenger Name field (required)
  - Age field (optional)
  - Gender dropdown (optional)
  - Previous/Next buttons

---

### Scenario 10: Fill Passenger Details - First Seat
**Steps:**
1. Enter name: "John Doe"
2. Leave age and gender empty
3. Click "Next" button

**Expected Result:**
- ✅ Validates name field (not empty)
- ✅ Moves to next seat
- ✅ Progress bar updates (2/2)
- ✅ Shows second seat number

---

### Scenario 11: Fill Passenger Details - Second Seat
**Steps:**
1. Enter name: "Jane Doe"
2. Leave age and gender empty (or fill them)
3. Click "Confirm Book" button (since this is the last seat)

**Expected Result:**
- ✅ Validates name field
- ✅ Shows "Processing..." on button
- ✅ On success: "Booking confirmed!"
- ✅ Alert shows success message
- ✅ Modal closes
- ✅ Page redirects or seats refresh

---

### Scenario 12: Check Updated Seat Map
**Steps:**
1. After booking confirmation
2. View seat map again

**Expected Result:**
- ✅ Previously selected seats now show booked status
- ✅ Seats show passenger initials (e.g., "JD" for John Doe)
- ✅ Seats are dark gray (disabled)
- ✅ Hover shows passenger name

---

### Scenario 13: View Booking History
**Steps:**
1. From Dashboard, click "My Bookings" card
2. Or navigate to `/my-bookings`

**Expected Result:**
- ✅ Shows list of bookings
- ✅ Each card displays:
  - Booking ID (last 8 chars)
  - Status: "CONFIRMED" (green badge)
  - Route info
  - Travel date
  - Seat numbers (e.g., "Seat A1", "Seat B1")
  - Booked on timestamp
  - "View Details" button
  - "Cancel Booking" button

---

### Scenario 14: View Booking Details
**Steps:**
1. On Booking History
2. Click "View Details" button

**Expected Result:**
- ✅ Shows alert with:
  - Booking ID
  - Seat number(s)
  - Status
  - Other booking information

---

### Scenario 15: Cancel Booking
**Steps:**
1. On Booking History
2. Click "Cancel Booking" button on a confirmed booking
3. Confirm cancellation in dialog

**Expected Result:**
- ✅ Shows confirmation dialog: "Are you sure you want to cancel this booking?"
- ✅ On confirm:
  - Booking status changes to "CANCELLED"
  - Badge turns red
  - "Cancel Booking" button disappears
  - Success alert shows

---

### Scenario 16: Test Responsive Design

#### Mobile (375px width)
**Steps:**
1. Open DevTools (F12)
2. Enable Device Emulation
3. Select iPhone 12 or similar
4. Refresh page

**Expected Result:**
- ✅ Dashboard: Single column layout
- ✅ Bus cards: Full width
- ✅ SeatBooking: Stacked layout (booking summary above seat map)
- ✅ Buttons: Full width, touch-friendly (40px+ height)
- ✅ Forms: Single column
- ✅ Text: Readable, no overflow

#### Tablet (768px width)
**Steps:**
1. Select iPad or similar in Device Emulation

**Expected Result:**
- ✅ Dashboard: Two-column layout
- ✅ Bus cards: Two per row
- ✅ SeatBooking: Side-by-side (booking summary on left, seat map on right)
- ✅ Good spacing and proportions

#### Desktop (1920px width)
**Steps:**
1. Maximize browser window on desktop

**Expected Result:**
- ✅ Dashboard: Three-column layout
- ✅ Bus cards: Three per row
- ✅ SeatBooking: Optimized three-column layout
- ✅ Plenty of breathing room
- ✅ Professional appearance

---

### Scenario 17: Test Error Handling

#### No Seats Available
**Steps:**
1. Try to book Bus 103 (marked as Full)

**Expected Result:**
- ✅ "Select Seats" button is disabled (grayed out)
- ✅ Can't click to view seats

#### Empty Passenger Name
**Steps:**
1. Select 2 seats
2. Click "Confirm Book"
3. Try to advance without entering name

**Expected Result:**
- ✅ Alert: "Please enter passenger name"
- ✅ Form doesn't advance

#### Network Error
**Steps:**
1. Disable internet or mock network error
2. Try to book

**Expected Result:**
- ✅ Error message displayed
- ✅ Appropriate error handling
- ✅ User can retry

---

### Scenario 18: Test Logout
**Steps:**
1. Click logout button in Header
2. Should redirect to login

**Expected Result:**
- ✅ User logged out
- ✅ Redirects to login page
- ✅ JWT token removed from localStorage
- ✅ Can log in again

---

## Sample Test Data

### Users
- Can use any Google account

### Buses (from SAMPLE_BUSES)

| Bus # | Route | Time | Available | Total |
|-------|-------|------|-----------|-------|
| 101   | Campus → City Center | 08:30 | 12 | 40 |
| 102   | Campus → Railway Stn | 09:00 | 20 | 40 |
| 103   | Campus → Bus Stand | 09:30 | 0 | 40 |
| 104   | Campus → Airport | 10:00 | 30 | 40 |
| 105   | Campus → Hospital | 08:00 | 16 | 40 |
| 106   | Campus → Shopping Mall | 10:00 | 18 | 40 |

### Seat Configuration
- Total seats: 60 per bus (10 rows × 6 columns)
- Layout: 3 seats left + aisle + 3 seats right
- Premium seats: Columns D, E (yellow)
- Price: ₹50 per seat

---

## Troubleshooting

### Issue: Login form still visible
- **Fix**: Clear index.html (already done)
- **Check**: Ensure no stray HTML in index.html

### Issue: Seats not loading
- **Check**: Ensure backend is running on port 4000
- **Check**: Verify API endpoints are working
- **Fix**: Check browser console for errors

### Issue: BusList not showing
- **Check**: Verify SAMPLE_BUSES import path
- **File**: `frontend/src/data/buses.js`

### Issue: Responsive design broken
- **Check**: Verify Tailwind CSS is loaded
- **Check**: Run `npm run build` to verify no build errors
- **File**: `frontend/vite.config.js`

### Issue: Seat selection not working
- **Check**: Console for JavaScript errors
- **Check**: Verify SeatMap component
- **Check**: Verify click handlers

---

## Performance Tips

1. **Images**: Use small, optimized images
2. **Bundle**: Check build size with `npm run build`
3. **API Calls**: Batch requests when possible
4. **Caching**: Bookings are cached in state
5. **Lazy Loading**: Dynamic imports for modals

---

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## Keyboard Shortcuts (Future)

- `B`: Book a bus
- `H`: View booking history
- `M`: My bookings
- `L`: Logout

---

## Next Steps

After testing, consider:
1. Backend API integration
2. Database optimization
3. Real-time notifications
4. Payment integration
5. QR codes for tickets
6. Admin dashboard enhancements

