import { auth, provider } from './firebase.js';
import { signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? '' : 'http://localhost:4000') + '/api';
const WS_URL = import.meta.env.VITE_WS_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

const TOTAL_SEATS = 55;
let selectedSeats = [];
let bookedSeats = [];
let reservedSeats = [];
let currentUser = null;
let authToken = null;
let currentTripId = null;
let socket = null;
let routesCache = [];
let hasBookedToday = false;

function showLoginSection() {
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('busSection').classList.remove('active');
  document.getElementById('busSection').classList.add('hidden');
}

function showBusSection(user) {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('busSection').classList.remove('hidden');
  document.getElementById('busSection').classList.add('active');
  const name = user.displayName || user.email?.split('@')[0] || 'User';
  document.getElementById('userEmail').textContent = `${name}, ${user.email}`;

  // Set initial route display
  const routeDisplay = document.getElementById('routeDisplay');
  const routeDate = document.getElementById('routeDate');
  if (routeDisplay) routeDisplay.textContent = 'Campus Route A → Main Campus';
  if (routeDate) routeDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  initSocket();
  loadRoutes();
  selectedSeats = [];
  bookedSeats = [];
  reservedSeats = [];
  updateSummary();
  switchPage('bookings');
}

async function exchangeGoogleForJwt(user) {
  const payload = {
    email: user.email,
    name: user.displayName || '',
    googleId: user.uid,
  };
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to exchange Google login');
  }
  const data = await res.json();
  authToken = data.token;
  localStorage.setItem('cb_jwt', authToken);
}

function initSocket() {
  if (socket) return;
  socket = io(WS_URL);
  socket.on('busLocationUpdate', (payload) => {
    if (payload.tripId === currentTripId) {
      showMessage(`Bus update: ${payload.etaMessage}`, 'success');
    }
  });
  socket.on('seatUpdate', (payload) => {
    if (payload.tripId === currentTripId && payload.confirmedSeats) {
      bookedSeats = [...new Set([...bookedSeats, ...payload.confirmedSeats])];
      generateSeats();
    }
  });
}

async function loadRoutes() {
  try {
    const res = await fetch(`${API_BASE}/routes`);
    const routes = await res.json();
    routesCache = Array.isArray(routes) ? routes : [];
    const routeSelect = document.getElementById('routeSelect');
    routeSelect.innerHTML = '<option value="">Select Route</option>';
    routesCache.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r._id;
      opt.textContent = r.name;
      routeSelect.appendChild(opt);
    });
    routeSelect.onchange = () => onRouteChange();
    onRouteChange();
  } catch (err) {
    console.error(err);
    showMessage('Failed to load routes', 'error');
  }
}

function onRouteChange() {
  const routeSelect = document.getElementById('routeSelect');
  const selected = routesCache.find((r) => r._id === routeSelect.value) || routesCache[0];
  if (selected) {
    populateStops(selected);
    loadTrips(selected._id);
  } else {
    document.getElementById('stopSelect').innerHTML = '<option value="">Select Stop</option>';
    document.getElementById('tripSelect').innerHTML = '<option value="">Select Departure</option>';
  }
}

function populateStops(route) {
  const stopSelect = document.getElementById('stopSelect');
  stopSelect.innerHTML = '<option value="">Select Stop</option>';
  (route.stops || []).forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.orderIndex;
    opt.textContent = s.name;
    stopSelect.appendChild(opt);
  });
}

async function loadTrips(routeId) {
  try {
    const res = await fetch(`${API_BASE}/routes/${routeId}/trips`, {
      headers: {
        Authorization: authToken ? `Bearer ${authToken}` : '',
      },
    });
    const trips = await res.json();
    const tripSelect = document.getElementById('tripSelect');
    tripSelect.innerHTML = '<option value="">Select Departure</option>';
    trips.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t._id;
      const time = new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      opt.textContent = `${time} — Bus ${t.bus?.plateNumber || 'N/A'}`;
      tripSelect.appendChild(opt);
    });
    tripSelect.onchange = () => onTripChange();
    if (trips.length > 0) {
      tripSelect.value = trips[0]._id;
      currentTripId = trips[0]._id;
      if (socket) {
        socket.emit('joinTrip', currentTripId);
      }
      await loadSeatMap();
    }
  } catch (err) {
    console.error(err);
    showMessage('Failed to load trips', 'error');
  }
}

async function onTripChange() {
  const tripSelect = document.getElementById('tripSelect');
  if (!tripSelect.value) return;
  if (socket && currentTripId) {
    socket.emit('leaveTrip', currentTripId);
  }
  currentTripId = tripSelect.value;
  if (socket) {
    socket.emit('joinTrip', currentTripId);
  }
  await loadSeatMap();
}

async function loadSeatMap() {
  if (!currentTripId) return;
  try {
    const res = await fetch(`${API_BASE}/bookings/trip/${currentTripId}/seat-map`, {
      headers: {
        Authorization: authToken ? `Bearer ${authToken}` : '',
      },
    });
    const data = await res.json();
    bookedSeats = data.bookedSeats || [];
    reservedSeats = data.reservedSeats || [];
    const capacity = data.capacity || TOTAL_SEATS;
    const bookedCount = data.bookedCount ?? bookedSeats.length;
    generateSeats(capacity);
    updateAvailabilityIndicator(capacity, bookedCount);
    if (data.etaMessage && data.crowdTag) {
      showMessage(`${data.etaMessage} (${(data.crowdTag || '').replace('_', ' ')})`, 'success');
    }
  } catch (err) {
    console.error(err);
    showMessage('Failed to load seat map', 'error');
  }
}

function updateAvailabilityIndicator(capacity, bookedCount) {
  const fill = document.getElementById('availFill');
  const text = document.getElementById('availText');
  if (!fill || !text) return;
  const available = Math.max(0, capacity - bookedCount);
  const pct = capacity ? (available / capacity) * 100 : 100;
  fill.style.width = `${pct}%`;
  text.textContent = `${available} / ${capacity} seats`;
}

function generateSeats(totalSeats = TOTAL_SEATS) {
  const container = document.getElementById('airplaneSeats');
  if (!container) return;
  container.innerHTML = '';

  const seatsPerRow = 6;
  const seatLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const totalRows = Math.ceil(totalSeats / seatsPerRow);

  for (let row = 1; row <= totalRows; row++) {
    const seatRow = document.createElement('div');
    seatRow.className = 'seat-row';

    // Row number
    const rowNumber = document.createElement('div');
    rowNumber.className = 'row-number';
    rowNumber.textContent = row;
    seatRow.appendChild(rowNumber);

    // Left seats (A, B, C)
    const leftGroup = document.createElement('div');
    leftGroup.className = 'seat-group';

    for (let i = 0; i < 3; i++) {
      const seatIndex = (row - 1) * seatsPerRow + i + 1;
      if (seatIndex > totalSeats) break;

      const seat = createSeat(seatIndex, seatLetters[i]);
      leftGroup.appendChild(seat);
    }
    seatRow.appendChild(leftGroup);

    // Aisle
    const aisle = document.createElement('div');
    aisle.className = 'aisle';
    seatRow.appendChild(aisle);

    // Right seats (D, E, F)
    const rightGroup = document.createElement('div');
    rightGroup.className = 'seat-group';

    for (let i = 3; i < 6; i++) {
      const seatIndex = (row - 1) * seatsPerRow + i + 1;
      if (seatIndex > totalSeats) break;

      const seat = createSeat(seatIndex, seatLetters[i]);
      rightGroup.appendChild(seat);
    }
    seatRow.appendChild(rightGroup);

    container.appendChild(seatRow);
  }

  updateSeatCounters();
}

function createSeat(seatNumber, seatLetter) {
  const seat = document.createElement('div');
  seat.className = 'seat';
  seat.textContent = seatLetter;
  seat.id = `seat-${seatNumber}`;

  // Add premium seats (every 10th seat or specific ones)
  if (seatNumber % 10 === 0 || seatNumber === 1 || seatNumber === 2) {
    seat.classList.add('premium');
  }

  if (bookedSeats.includes(seatNumber)) {
    seat.classList.add('booked');
  } else if (reservedSeats.includes(seatNumber)) {
    seat.classList.add('reserved');
  } else if (hasBookedToday) {
    seat.classList.add('disabled');
  } else {
    seat.onclick = () => toggleSeat(seatNumber);
  }

  if (selectedSeats.includes(seatNumber)) {
    seat.classList.add('selected');
  }

  return seat;
}

function toggleSeat(seatNumber) {
  const seatElement = document.getElementById(`seat-${seatNumber}`);
  if (!seatElement || seatElement.classList.contains('booked') || seatElement.classList.contains('reserved') || hasBookedToday) {
    return;
  }
  const index = selectedSeats.indexOf(seatNumber);
  if (index > -1) {
    selectedSeats.splice(index, 1);
    seatElement.classList.remove('selected');
  } else {
    selectedSeats.push(seatNumber);
    seatElement.classList.add('selected');
  }
  updateSummary();
}

function updateSummary() {
  const seatCount = selectedSeats.length;

  // Update selected seats list
  const selectedSeatsList = document.getElementById('selectedSeatsList');
  if (selectedSeatsList) {
    selectedSeatsList.textContent = selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None';
  }

  // Update price summary
  const pricePerSeat = 50; // ₹50 per seat
  const totalPrice = seatCount * pricePerSeat;

  const priceCount = document.getElementById('priceCount');
  const totalPriceEl = document.getElementById('totalPrice');
  const finalTotalEl = document.getElementById('finalTotal');

  if (priceCount) priceCount.textContent = seatCount;
  if (totalPriceEl) totalPriceEl.textContent = totalPrice;
  if (finalTotalEl) finalTotalEl.textContent = totalPrice;

  // Update button
  const bookBtn = document.getElementById('bookBtn');
  if (bookBtn) {
    bookBtn.disabled = selectedSeats.length === 0;
  }

  updateSeatCounters();
}

function updateSeatCounters() {
  const totalSeats = TOTAL_SEATS;
  const availableCount = totalSeats - bookedSeats.length - reservedSeats.length - (hasBookedToday ? 0 : selectedSeats.length);
  const occupiedCount = bookedSeats.length + reservedSeats.length;
  const selectedCount = selectedSeats.length;

  const availableEl = document.getElementById('availableCount');
  const occupiedEl = document.getElementById('occupiedCount');
  const selectedEl = document.getElementById('selectedCount');

  if (availableEl) availableEl.textContent = availableCount;
  if (occupiedEl) occupiedEl.textContent = occupiedCount;
  if (selectedEl) selectedEl.textContent = selectedCount;
}

async function bookSeatDirect(seatNumber) {
  if (!currentTripId) {
    // No active trip selected; silently ignore to avoid confusing message.
    console.warn('No active trip selected for booking');
    return;
  }
  if (hasBookedToday) {
    showMessage('You already booked a seat for today', 'error');
    return;
  }

  const seatEl = document.getElementById(`seat-${seatNumber}`);
  if (seatEl) {
    // Instant feedback: green → blue while booking
    seatEl.classList.add('selected');
    seatEl.style.pointerEvents = 'none';
  }
  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken ? `Bearer ${authToken}` : '',
      },
      body: JSON.stringify({
        tripId: currentTripId,
        seatNumbers: [seatNumber],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (seatEl) {
        seatEl.classList.remove('selected');
        seatEl.style.pointerEvents = '';
      }
      showMessage(data.message || 'Booking failed', 'error');
      return;
    }
    const confirmed = data.confirmedSeats || [];
    const waitlisted = data.waitlistedSeats || [];

    if (confirmed.includes(seatNumber)) {
      showMessage('Slot Booked Successfully', 'success');
      addPassengerToLists(seatNumber);
    } else if (waitlisted.includes(seatNumber)) {
      showMessage('Seat added to waitlist', 'success');
    } else {
      showMessage('Booking processed', 'success');
    }

    selectedSeats = [seatNumber];
    updateSummary();

    await loadSeatMap();
    await refreshAttendance();
  } catch (err) {
    console.error(err);
    if (seatEl) {
      seatEl.classList.remove('selected');
      seatEl.style.pointerEvents = '';
    }
    showMessage('Booking failed', 'error');
  }
}

function addPassengerToLists(seatNumber) {
  const name = currentUser?.displayName || currentUser?.email || 'Student';
  const busName = document.getElementById('selectedBusDisplay')?.textContent || '';

  const passengersList = document.getElementById('passengersList');
  const attendanceList = document.getElementById('attendancePassengers');

  if (passengersList) {
    const row = document.createElement('div');
    row.className = 'passenger-item';
    row.innerHTML = `
      <span class="pass-check">✓</span>
      <span class="pass-name">${name}</span>
      <span class="pass-slot">${busName ? `${busName} · ` : ''}Seat ${seatNumber}</span>
    `;
    passengersList.prepend(row);
  }

  if (attendanceList) {
    const row = document.createElement('div');
    row.className = 'passenger-item';
    row.innerHTML = `
      <span class="pass-check">✓</span>
      <span class="pass-name">${name}</span>
      <span class="pass-slot">Seat ${seatNumber}</span>
    `;
    attendanceList.prepend(row);
  }
}

async function refreshAttendance() {
  if (!authToken) return;
  try {
    const [todayRes, summaryRes] = await Promise.all([
      fetch(`${API_BASE}/attendance/me/today`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
      fetch(`${API_BASE}/attendance/me/summary`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
    ]);
    const today = await todayRes.json();
    const summary = await summaryRes.json();

    hasBookedToday = today?.status === 'Present' && Number(today?.slotsToday || 0) > 0;

    const todayEl = document.getElementById('attToday');
    const todaySidebar = document.querySelector('.attendance-card .att-text');
    const percentEl = document.getElementById('attPercent');
    const percentSidebar = document.querySelector('.attendance-card .att-percent');
    const slotsEl = document.getElementById('attSlots');
    const slotsSidebar = document.getElementById('totalBookedSlots');

    if (todayEl) todayEl.textContent = today.status || 'Absent';
    if (todaySidebar) todaySidebar.textContent = today.status || 'Absent';
    if (percentEl && typeof summary.percent === 'number') {
      percentEl.textContent = `${summary.percent.toFixed(0)}%`;
    }
    if (percentSidebar && typeof summary.percent === 'number') {
      percentSidebar.textContent = `${summary.percent.toFixed(0)}%`;
    }
    if (slotsEl && typeof today.slotsToday === 'number') {
      slotsEl.textContent = String(today.slotsToday);
    }
    if (slotsSidebar && typeof today.slotsToday === 'number') {
      slotsSidebar.textContent = String(today.slotsToday);
    }
  } catch (err) {
    console.error('Failed to refresh attendance', err);
  }
}

async function bookSeats() {
  if (selectedSeats.length === 0) {
    showMessage('Please select at least one seat', 'error');
    return;
  }
  if (!currentTripId) return;
  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken ? `Bearer ${authToken}` : '',
      },
      body: JSON.stringify({
        tripId: currentTripId,
        seatNumbers: selectedSeats,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || 'Booking failed', 'error');
      return;
    }
    const confirmed = data.confirmedSeats || [];
    const waitlisted = data.waitlistedSeats || [];
    showMessage(
      `Booking processed. Confirmed: ${confirmed.join(', ') || 'none'}; Waitlisted: ${waitlisted.join(', ') || 'none'}`,
      'success'
    );
    if (confirmed.length > 0) {
      await refreshAttendance();
    }
    selectedSeats = [];
    await loadSeatMap();
    updateSummary();
  } catch (err) {
    console.error(err);
    showMessage('Booking failed', 'error');
  }
}

function showMessage(text, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  setTimeout(() => {
    messageDiv.textContent = '';
    messageDiv.className = '';
  }, 3000);
}

function logoutUser() {
  signOut(auth)
    .then(() => {
      currentUser = null;
      authToken = null;
      localStorage.removeItem('cb_jwt');
      if (socket && currentTripId) {
        socket.emit('leaveTrip', currentTripId);
      }
      showLoginSection();
    })
    .catch((err) => {
      console.error('Logout error:', err);
    });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    const stored = localStorage.getItem('cb_jwt');
    if (stored) {
      authToken = stored;
      showBusSection(user);
      refreshAttendance();
      return;
    }
    exchangeGoogleForJwt(user)
      .then(() => {
        showBusSection(user);
        refreshAttendance();
      })
      .catch((err) => {
        console.error('JWT exchange failed', err);
        showLoginSection();
      });
  } else {
    currentUser = null;
    authToken = null;
    showLoginSection();
  }
});

document.getElementById('googleBtn').addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    await exchangeGoogleForJwt(result.user);
    alert('Login successful! Loading Bus Seat Booking...');
  } catch (error) {
    console.error('Firebase sign-in error:', error);
    alert('Google Sign-In failed. Please try again.');
  }
});

document.getElementById('logoutBtn').addEventListener('click', logoutUser);
document.getElementById('bookBtn').addEventListener('click', bookSeats);

// Bus card selection handler: when clicking a bus card, try to pick matching trip
document.querySelectorAll('.bus-card').forEach((card) => {
  card.addEventListener('click', async () => {
    document.querySelectorAll('.bus-card').forEach((c) => c.classList.remove('active'));
    card.classList.add('active');

    const nameEl = card.querySelector('.bus-name');
    const busName = nameEl ? nameEl.textContent : card.getAttribute('data-bus') || '';
    const titleSpan = document.getElementById('selectedBusDisplay');
    const seatTitleSpan = document.getElementById('seatTitleBus');
    if (titleSpan) titleSpan.textContent = busName;
    if (seatTitleSpan) seatTitleSpan.textContent = busName;

    // Update route display
    const routeDisplay = document.getElementById('routeDisplay');
    const routeDate = document.getElementById('routeDate');
    if (routeDisplay) routeDisplay.textContent = `Campus Route ${busName} → Main Campus`;
    if (routeDate) routeDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Clear previous seat UI before loading new bus seats
    selectedSeats = [];
    updateSummary();
    const seatContainer = document.getElementById('airplaneSeats');
    if (seatContainer) seatContainer.innerHTML = '';

    const tripSelect = document.getElementById('tripSelect');
    let matched = false;

    if (tripSelect) {
      for (const opt of tripSelect.options) {
        if (opt.text.includes(busName)) {
          tripSelect.value = opt.value;
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      await onTripChange();
    } else {
      // Fallback: show a fresh, fully-available seat layout
      currentTripId = null;
      bookedSeats = [];
      reservedSeats = [];
      generateSeats(TOTAL_SEATS);
      updateAvailabilityIndicator(TOTAL_SEATS, 0);
    }
  });
});

document.getElementById('signinForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  console.log('Email sign-in payload:', payload);
});

function switchPage(pageId) {
  const pages = ['bookings', 'attendance', 'maps', 'reviews', 'settings'];
  pages.forEach((id) => {
    const page = document.getElementById(`page${id.charAt(0).toUpperCase() + id.slice(1)}`);
    const navItems = document.querySelectorAll(`.nav-item[data-page="${id}"]`);
    const footerItems = document.querySelectorAll(`.footer-item[data-page="${id}"]`);
    const isActive = id === pageId;
    if (page) page.classList.toggle('active', isActive);
    navItems.forEach((el) => el.classList.toggle('active', isActive));
    footerItems.forEach((el) => el.classList.toggle('active', isActive));
  });
  if (pageId === 'attendance') {
    document.getElementById('attToday').textContent = 'Present';
    document.getElementById('attPercent').textContent = '—%';
  }
}

document.querySelectorAll('.nav-item[data-page], .footer-item[data-page]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const page = el.getAttribute('data-page');
    if (page) switchPage(page);
  });
});

document.getElementById('sosBtn')?.addEventListener('click', () => {
  if (!authToken) return;
  fetch(`${API_BASE}/safety/panic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ tripId: currentTripId || '', location: 'Current location' }),
  }).then((r) => r.json()).then((d) => {
    showMessage(d.message || 'SOS sent to campus security', 'success');
  }).catch(() => {
    showMessage('Emergency SOS — alert sent (demo)', 'success');
  });
});

// Share location button
document.getElementById('shareBtn')?.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  navigator.geolocation.getCurrentPosition((pos) => {
    showMessage(`Location shared: ${pos.coords.latitude}, ${pos.coords.longitude}`, 'success');
  }, () => {
    showMessage('Location sharing denied', 'error');
  });
});
