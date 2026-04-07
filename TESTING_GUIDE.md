# Campus Bus Booking System - Testing Guide

## Unit Testing Scenarios

### Test 1: User Login Flow ✅
**Steps:**
1. Navigate to `/login`
2. Click "Sign in with Google"
3. Complete Google authentication
4. Verify redirected to dashboard
5. Check user email displayed in header

**Expected Outcome:** User logged in, JWT token saved

---

### Test 2: View Buses on Dashboard ✅
**Steps:**
1. Login successfully
2. Check Dashboard page
3. Verify bus cards display route info
4. Confirm "View Seats" button exists
5. Click a bus card

**Expected Outcome:** Bus list loads, cards show correctly

---

### Test 3: Seat Selection ✅
**Steps:**
1. From Dashboard click "View Seats"
2. On Seat Booking page, click 3 available grey seats
3. Verify seats turn green
4. Verify seat numbers appear in left panel
5. Check price calculation updates
6. Click same seat again to deselect
7. Verify seat turns grey again

**Expected Outcome:** 
- Seats toggle between grey (available) and green (selected)
- Price updates correctly (₹50 per seat)
- Selected seats list updates

---

### Test 4: Passenger Details Modal ✅
**Steps:**
1. Select 3 seats
2. Click "Confirm Book" button
3. Modal opens showing "Seat 1 of 3"
4. Enter passenger name for first seat
5. Click "Next"
6. Verify progress bar updates
7. Enter details for seat 2
8. Click "Next" again
9. Enter details for seat 3 (last)
10. Click "Confirm Booking"

**Expected Outcome:**
- Modal shows multi-step form
- Progress bar shows 33%, 66%, 100%
- Can navigate between seats
- All passenger names stored

---

### Test 5: Booking Confirmation ✅
**Steps:**
1. Complete passenger form submission
2. On seat map, verify selected seats now red
3. Try clicking red seats (should be disabled)
4. Check booking in "My Bookings"
5. Verify booking shows passenger names

**Expected Outcome:**
- Red seats cannot be clicked
- Booking appears in history with red seats
- All passenger names visible

---

### Test 6: Real-Time Seat Updates ✅
**Steps:**
1. Open browser window 1 (User A) - Login
2. Open browser window 2 (User B) - Login different account
3. Both navigate to same bus
4. User A selects seats 1,2,3 and confirms
5. In User B's window, watch seats 1,2,3
6. Verify seats automatically turn red in User B

**Expected Outcome:** Real-time update via Socket.IO - seats marked occupied instantly

---

### Test 7: Booking History ✅
**Steps:**
1. Click "My Bookings" in header
2. View all bookings
3. Click "View Details" on a booking
4. Verify details show: ID, seats, status, date
5. Click "Cancel Booking" on a confirmed booking
6. Confirm cancellation
7. Verify status changes to "Cancelled"

**Expected Outcome:**
- History lists all bookings
- Can view details
- Can cancel bookings
- Status updates properly

---

### Test 8: Seat Legend ✅
**Steps:**
1. Go to Seat Booking page
2. Check legend panel on left
3. Verify all 4 colors displayed:
   - Light grey: Available
   - Green: Selected
   - Dark grey: Occupied
   - Gold: Extra Comfort

**Expected Outcome:** Legend accurately represents seat states

---

### Test 9: Price Calculation ✅
**Steps:**
1. Select 0 seats → Total = ₹0
2. Select 1 seat → Total = ₹50
3. Select 3 seats → Total = ₹150
4. Select 5 seats → Total = ₹250

**Expected Outcome:** Price = number of seats × ₹50

---

### Test 10: Admin Dashboard ✅
**Steps:**
1. Login as admin user (role: 'admin' in JWT)
2. Navigate to `/admin`
3. View statistics tab:
   - Total users count
   - Total bookings count
   - Total buses count
4. Click "Buses" tab
5. Verify bus list displays with:
   - Bus ID
   - Capacity
   - Status
6. Click "Bookings" tab
7. Verify bookings listed with:
   - Booking ID
   - Seat number
   - Status
   - Date

**Expected Outcome:**
- Admin can access dashboard
- All stats display correctly
- Can view buses and bookings
- Non-admin cannot access

---

## Integration Testing

### Test 11: Complete E2E Flow ✅

**Scenario:** New user books 3 seats and confirms

```
1. Open http://localhost:5173
   ↓
2. Login with Google
   ↓
3. Dashboard loads, shows 3 bus options
   ↓
4. Click "View Seats" on Bus 101
   ↓
5. Seat map loads with 60 seats (10×6)
   ↓
6. Click seats 7, 8, 11
   ↓
7. Verify:
   - Seats turn green
   - Left panel shows "7, 8, 11"
   - Price shows "₹150"
   ↓
8. Click "Confirm Book"
   ↓
9. Modal opens with "Seat 1 of 3"
   ↓
10. Enter "Vishal" name, age 20, gender Male
   ↓
11. Click "Next"
   ↓
12. Enter "Arun" name, age 21, gender Male
   ↓
13. Click "Next"
   ↓
14. Enter "Karthik" name, age 19, gender Male
   ↓
15. Click "Confirm Booking"
   ↓
16. Modal closes
   ↓
17. Seats 7,8,11 now RED on seat map
   ↓
18. Shows "V A K" as initials on booked seats
   ↓
19. Click "My Bookings"
   ↓
20. Booking visible:
    - Seats 7,8,11
    - Status: Confirmed
    - Passengers: Vishal, Arun, Karthik
    ✓ SUCCESS
```

---

## Edge Cases & Error Handling

### Test 12: Error Handling ❌
**Scenarios to trigger errors:**

1. **Empty Passenger Name**
   - Try to submit with blank name field
   - Expected: Alert "Please enter passenger name"

2. **Network Error**
   - Disable internet during booking
   - Expected: Error message shows "Booking failed"

3. **Duplicate Booking Same Day**
   - Book seat in Bus 101
   - Try to book seat in Bus 102 same day
   - Expected: Error "You already booked a seat for today"

4. **Seat Already Taken**
   - Two users try to book same seat
   - First succeeds, second gets error
   - Expected: Error "Seat already booked"

5. **Unauthorized Admin Access**
   - Non-admin tries to access `/admin`
   - Expected: Redirected to dashboard

---

## Performance Testing

### Test 13: Load Times ⚡
**Measure:**
- Dashboard loads in < 2 seconds
- Seat map renders 60 seats smoothly
- Modal opens without lag
- Seat selection instant response

**Expected:** No jank, smooth animations

---

## Browser Compatibility

### Test 14: Cross-Browser ✓
Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Expected:** All features work without errors

---

## Responsive Design Testing

### Test 15: Mobile Responsiveness 📱
**Steps on Mobile (< 768px width):**
1. Login works
2. Dashboard cards stack vertically
3. Seat map readable
4. Buttons clickable (48px+ size)
5. Modal fills screen properly
6. All text readable
7. Horizontal scroll not needed

**Expected:** Fully responsive, no horizontal overflow

---

## API Response Testing

### Test 16: API Endpoints ✔️

**Test each endpoint response:**

```bash
# Test seat map endpoint
curl http://localhost:4000/api/bookings/trip/{tripId}/seat-map \
  -H "Authorization: Bearer {token}"

# Test get buses
curl http://localhost:4000/api/buses \
  -H "Authorization: Bearer {token}"

# Test get user bookings
curl http://localhost:4000/api/bookings/user \
  -H "Authorization: Bearer {token}"

# Test admin stats (admin only)
curl http://localhost:4000/api/admin/stats \
  -H "Authorization: Bearer {token}"
```

---

## Socket.IO Testing

### Test 17: Real-Time Communication 🔄

**Using DevTools console:**
```javascript
// Monitor Socket.IO connection
io.on('connect', () => console.log('Connected'))
io.on('seatUpdate', (data) => console.log('Seat update:', data))

// In browser console:
window.location.reload() // Verify reconnects
```

**Expected:**
- Connection established
- Events received in real-time
- No console errors

---

## Database Testing

### Test 18: MongoDB Queries ➡️

**Verify data persistence:**
```bash
# Connect to MongoDB
mongosh

# Check bookings
db.bookings.find().pretty()

# Count confirmed bookings
db.bookings.countDocuments({status: 'confirmed'})

# Find user bookings
db.bookings.find({user: ObjectId("...")})

# Verify seats marked as booked
db.bookings.find({seatNumber: {$in: [7,8,11]}})
```

---

## Accessibility Testing

### Test 19: A11y Compliance ♿

- [ ] Keyboard navigation works
- [ ] Tab order makes sense
- [ ] Screen reader announces buttons
- [ ] Color contrast sufficient
- [ ] ARIA labels present
- [ ] Form fields labeled properly

---

## Security Testing

### Test 20: Security Checks 🔒

- [ ] JWT token verified on all requests
- [ ] Cannot access /admin without admin role
- [ ] Cannot modify other user's bookings
- [ ] Password not exposed in logs
- [ ] API validates all inputs
- [ ] CORS properly configured

---

## Stress Testing

### Test 21: Concurrent Users 👥

**Simulate 10 concurrent users:**
```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:4000/api/buses

# Expected: No errors, consistent response times
```

---

## Final Checklist ✅

Before going to production:
- [ ] All 21 tests passed
- [ ] No console errors
- [ ] No network errors
- [ ] Responsive on all devices
- [ ] All animations smooth
- [ ] Real-time updates working
- [ ] Admin dashboard functional
- [ ] Booking history accurate
- [ ] Cancellation works
- [ ] Firebase auth configured
- [ ] MongoDB connection stable
- [ ] JWT tokens issued correctly
- [ ] Socket.IO events emitting
- [ ] Error messages clear
- [ ] Performance acceptable

---

## Test Result Template

```
Test ID: __
Test Name: __
Status: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
Expected: __
Actual: __
Notes: __
```

---

**Ready to test? Fire up the servers and go through each scenario!** 🧪
