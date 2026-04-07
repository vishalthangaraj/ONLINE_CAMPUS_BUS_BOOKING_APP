# Online Campus Bus Booking System - MASTER PROMPT

## Objective
Build a smart Bus Seat Booking System for campus transportation at
Bannari Amman Institute of Technology.

The system allows students to:
- Login using Google
- Select buses
- View seat availability
- Book seats in real-time
- Track their bus route

## Step 1: Google Authentication
- Use Firebase Authentication (Google Sign-In).
- After login, redirect to Dashboard.
- Dashboard shows:
  - User Name
  - Email
  - Profile Picture

## Step 2: Dashboard
- Show user info.
- Show button: Select Bus.

## Step 3: Bus Selection Page
Create clickable bus cards:
- BIT01 - Tiruppur -> College
- BIT02 - Gobichettipalayam -> College
- BIT03 - Erode -> College
- BIT04 - Salem -> College
- BIT05 - Karur -> College

UI behavior:
- Card layout
- Click card -> open Seat Booking page

## Step 4: Seat Booking System
Seat layout:
- Grid: 5 x 10
- Total seats: 50

Seat colors:
- White: Available
- Blue: Selected
- Green: Booked

Each seat includes:
- Seat Number
- Status

## Step 5: Booking Logic
Flow:
1. Click available seat -> Selected
2. Click Confirm Booking

Backend logic:
- Check if seat is still available
- Update Firebase seat status to booked
- Save booking for the user

Result:
- Seat becomes Green
- Seat locked for others

## Step 6: Route Tracking
After booking, show:
- Start Location
- Current Location (optional)
- Destination (College)

Example:
- Tiruppur -> BIT

Tech:
- Google Maps API (optional for live map)

## Step 7: Firebase Data Structure
```text
buses: {
  BIT01: {
    route: "Tiruppur to College",
    seats: {
      "1": "available",
      "2": "booked",
      "3": "available"
    }
  }
}

bookings: {
  userId123: {
    bus: "BIT01",
    seat: 3
  }
}
```

## Step 8: Real-Time Updates
Use Firebase listeners.

Behavior:
- One user books -> all users see update instantly
- Seat turns Green in real-time

## Step 9: Page Flow
User journey:
1. Login Page
2. Dashboard
3. Bus Selection
4. Seat Booking
5. Confirmation
6. Optional Tracking Page

## Step 10: Bonus Features
- My Booking Page
- Cancel Booking
- Admin Panel
- Live Tracking
- Notifications

## Final Flow
Login -> Select Bus -> Select Seat -> Confirm -> Track

---

## DRY RUN (IMPORTANT)

### Scenario
User books a seat in BIT01.

### Step 1: Login
User signs in. Firebase returns:
- Name
- Email
- Profile

Redirect to Dashboard.

### Step 2: Select Bus
User clicks BIT01.

### Step 3: Seat Load
Initial state example:
- Seat 2 -> Booked
- Seat 10 -> Booked
- Others -> Available

### Step 4: Select Seat
User clicks Seat 3.

Seat becomes Selected.

### Step 5: Confirm
System:
- Checks availability
- Updates Firebase
- Saves booking

### Step 6: Real-Time
All users see Seat 3 become Booked.

### Step 7: Confirmation
Display:
- Bus: BIT01
- Seat: 3
- Route: Tiruppur -> College

### Step 8: Tracking
Show:
- Start -> Current -> College

## Edge Case (Very Important)
Two users select same seat:
- User A confirms first -> Success
- User B confirms later -> Rejected

Show message:
- Seat already booked

## Core Logic Summary
- Firebase stores seat state
- Booking follows: Check -> Update -> Lock
- Real-time sync prevents conflicts

## Tech Stack
Frontend:
- HTML
- CSS
- JavaScript (or React)

Backend:
- Firebase Auth
- Firestore Database

APIs:
- Google Maps API (optional)

## Expected Output
A real-time web app where:
- Students can book seats easily
- No duplicate booking
- Live updates work
- UI feels like a real product

## Next Step Trigger
If implementation is needed, use:
Give full code
