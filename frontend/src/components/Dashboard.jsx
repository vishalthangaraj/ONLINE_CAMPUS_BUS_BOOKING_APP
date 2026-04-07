import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { shimApiService } from '../services/api'
import { CAMPUS_BUSES } from '../data/campusBuses'

const PAGE = {
  DASHBOARD: 'dashboard',
  SEATS: 'seats',
  CONFIRMATION: 'confirmation',
}

const TABS = {
  HISTORY: 'history',
  SCHEDULE: 'schedule',
  SUPPORT: 'support',
}

const getTodayDate = () => {
  const dt = new Date()
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const DEFAULT_SEARCH = {
  fromCity: 'All',
  toCity: 'Erode',
  travelDate: getTodayDate(),
}

const DEPARTURE_TIMES = {
  BIT1: '08:15 AM',
  BIT2: '08:30 AM',
  BIT3: '08:45 AM',
  BIT4: '09:00 AM',
  BIT5: '09:15 AM',
}

const TRACKER_ROUTE = ['Campus', 'Sathyamangalam', 'Erode']

const seatClass = (status, isSelected) => {
  if (status === 'booked') return 'seat seat-booked'
  if (isSelected) return 'seat seat-selected'
  return 'seat seat-available'
}

const getSeatsLeft = (bus) => {
  const seats = Object.values(bus?.seats || {})
  const booked = seats.filter((seat) => seat?.status === 'booked').length
  return Math.max((bus?.totalSeats || 50) - booked, 0)
}

const normalizeBusNumber = (raw) => {
  const text = String(raw || '').toUpperCase()
  const match = text.match(/BIT0*([1-5])/)
  if (match) return `BIT${match[1]}`
  return text || 'BIT1'
}

const getBusStatus = (bus) => {
  if (!bus) return 'Available'
  if (bus.name === 'BIT3') return 'On the way'
  if (getSeatsLeft(bus) <= 0) return 'Full'
  return 'Available'
}

const formatDate = (value) => {
  if (!value) return '-'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleDateString('en-GB')
}

const bookingDateText = (createdAt, fallbackDate) => {
  if (createdAt?.seconds) {
    return new Date(createdAt.seconds * 1000).toLocaleDateString('en-GB')
  }
  return formatDate(fallbackDate)
}

const LOCAL_MOCK_SEAT_KEY_PREFIX = 'cb_mock_bus_state_'
const LOCAL_BOOKINGS_KEY = 'cb_local_bookings'

const isFirestoreDisabledError = (err) => {
  const code = String(err?.code || '').toLowerCase()
  const message = String(err?.message || '').toLowerCase()
  return code.includes('failed-precondition') || message.includes('firestore.googleapis.com')
}

const readLocalMockSeats = (travelDate) => {
  try {
    const raw = localStorage.getItem(`${LOCAL_MOCK_SEAT_KEY_PREFIX}${travelDate}`)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeLocalMockSeats = (travelDate, seatsData) => {
  localStorage.setItem(`${LOCAL_MOCK_SEAT_KEY_PREFIX}${travelDate}`, JSON.stringify(seatsData || {}))
}

const readLocalBookings = () => {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeLocalBookings = (bookings) => {
  localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(bookings || []))
}

const getBookingErrorMessage = (err) => {
  return err?.response?.data?.error || err.message || 'Booking failed. Please try again.'
}

export default function Dashboard({ user, onLogout }) {
  const [page, setPage] = useState(PAGE.DASHBOARD)
  const [activeTab, setActiveTab] = useState(TABS.HISTORY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportSent, setSupportSent] = useState(false)
  const [search, setSearch] = useState(DEFAULT_SEARCH)

  const [buses, setBuses] = useState([])
  const [selectedBusId, setSelectedBusId] = useState('')
  const [selectedSeats, setSelectedSeats] = useState([])
  const [mockBookings, setMockBookings] = useState([])
  const [mockBusSeats, setMockBusSeats] = useState({})
  const [bookingResult, setBookingResult] = useState(null)
  const [routeIndex, setRouteIndex] = useState(0)
  const [trackerIndex, setTrackerIndex] = useState(0)
  const [bookingHistory, setBookingHistory] = useState([])
  const [firestoreFallbackMode, setFirestoreFallbackMode] = useState(false)
  const [dynamicNextDeparture, setDynamicNextDeparture] = useState(DEPARTURE_TIMES.BIT1)

  const selectedBus = useMemo(() => {
    const mockBuses = {
      BITNO1: { from: 'Tiruppur' },
      BITNO2: { from: 'Salem' },
      BITNO3: { from: 'Erode' },
      BITNO4: { from: 'Gobi' },
      BITNO5: { from: 'Coimbatore' },
      BITNO6: { from: 'Puliyampatti' }
    };
    if (mockBuses[selectedBusId]) {
      return {
        id: selectedBusId,
        name: `Bus ${selectedBusId}`,
        fromCity: mockBuses[selectedBusId].from,
        toCity: 'College',
        route: `${mockBuses[selectedBusId].from} -> College`,
        totalSeats: 45,
        isMock: true
      };
    }
    return buses.find((bus) => bus.id === selectedBusId) || null;
  }, [buses, selectedBusId])

  const sortedBuses = useMemo(() => {
    return [...buses].sort((a, b) => {
      const aNum = Number(normalizeBusNumber(a.name).replace('BIT', ''))
      const bNum = Number(normalizeBusNumber(b.name).replace('BIT', ''))
      return aNum - bNum
    })
  }, [buses])

  const availableBuses = useMemo(() => {
    let mockAvailable = 0;
    const mockBusIds = ['BITNO1', 'BITNO2', 'BITNO3', 'BITNO4', 'BITNO5', 'BITNO6'];
    mockBusIds.forEach(id => {
      if ((mockBusSeats[id]?.length || 0) < 45) mockAvailable++;
    });
    return sortedBuses.filter((bus) => getBusStatus(bus) !== 'Full').length + mockAvailable;
  }, [sortedBuses, mockBusSeats])

  const totalSeatsAvailable = useMemo(() => {
    let mockTotal = 0;
    const mockBusIds = ['BITNO1', 'BITNO2', 'BITNO3', 'BITNO4', 'BITNO5', 'BITNO6'];
    mockBusIds.forEach(id => {
      const booked = mockBusSeats[id]?.length || 0;
      mockTotal += (45 - booked);
    });
    const fbTotal = sortedBuses.reduce((sum, bus) => sum + getSeatsLeft(bus), 0);
    return fbTotal + mockTotal;
  }, [sortedBuses, mockBusSeats])

  const nextDeparture = useMemo(() => {
    return dynamicNextDeparture
  }, [dynamicNextDeparture])

  useEffect(() => {
    const times = Object.values(DEPARTURE_TIMES)
    const interval = setInterval(() => {
      const randomTime = times[Math.floor(Math.random() * times.length)]
      setDynamicNextDeparture(randomTime)
    }, 8000) // Change every 8 seconds
    return () => clearInterval(interval)
  }, [])

  const filteredBuses = useMemo(() => {
    return sortedBuses.filter((bus) => {
      const fromOk = bus.fromCity.toLowerCase() === search.fromCity.toLowerCase()
      const toOk = bus.toCity.toLowerCase() === search.toCity.toLowerCase()
      return fromOk && toOk
    })
  }, [search.fromCity, search.toCity, sortedBuses])

  const seatNumbers = useMemo(() => {
    const totalSeats = selectedBus?.totalSeats || (selectedBus?.isMock ? 45 : 0)
    return Array.from({ length: totalSeats }, (_, index) => `S${index + 1}`)
  }, [selectedBus?.totalSeats, selectedBus?.isMock])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError('')
      try {
        await shimApiService.seedBuses()
        const response = await shimApiService.getBuses()
        const mapped = response.data.map((item) => ({
          id: item._id,
          ...item,
          routePoints: TRACKER_ROUTE,
        }))
        setBuses(mapped)
      } catch (err) {
        setFirestoreFallbackMode(true)
        setBuses(CAMPUS_BUSES.map((bus) => ({ ...bus })))
        setError('Running in local booking mode fallback.')
      } finally {
        setLoading(false)
      }
    }
    init()
    
    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:4000')
    socket.on('buses-update', (updatedBuses) => {
      const mapped = updatedBuses.map((item) => ({
        id: item._id, ...item, routePoints: TRACKER_ROUTE,
      }))
      setBuses(mapped)
    })
    socket.on('mock-state-update', (data) => {
      setMockBusSeats(data.seats || {})
    })
    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    if (!search?.travelDate) return undefined
    if (firestoreFallbackMode) {
      setMockBusSeats(readLocalMockSeats(search.travelDate))
      return undefined
    }
    const fetchMock = async () => {
      try {
        const res = await shimApiService.getMockState(search.travelDate)
        setMockBusSeats(res.data || {})
      } catch (err) { }
    }
    fetchMock()
  }, [firestoreFallbackMode, search.travelDate])

  useEffect(() => {
    if (!user?.uid) return undefined
    if (firestoreFallbackMode) {
      const history = readLocalBookings()
        .filter((item) => item.userId === user.uid)
        .sort((a, b) => (b.createdAtTs || 0) - (a.createdAtTs || 0))
      setBookingHistory(history)
      return undefined
    }
    const fetchHistory = async () => {
      try {
        const res = await shimApiService.getUserBookings(user.uid)
        setBookingHistory(res.data || [])
      } catch (err) { }
    }
    fetchHistory()
  }, [firestoreFallbackMode, user?.uid, page, activeTab])

  useEffect(() => {
    const timer = setInterval(() => {
      setTrackerIndex((current) => (current + 1) % TRACKER_ROUTE.length)
    }, 3500)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!bookingResult?.routePoints?.length) return undefined

    const routeLength = bookingResult.routePoints.length
    const timer = setInterval(() => {
      setRouteIndex((current) => {
        if (current >= routeLength - 1) return current
        return current + 1
      })
    }, 5000)

    return () => clearInterval(timer)
  }, [bookingResult])

  const openBusBooking = (busId) => {
    setSelectedBusId(busId)
    setSelectedSeats([])
    setBookingResult(null)
    setRouteIndex(0)
    setError('')
    setPage(PAGE.SEATS)
  }

  const handleSeatClick = (seatNo) => {
    if (!selectedBus) return
    const isMockBooked = mockBusSeats[selectedBus.id]?.includes(seatNo)
    const status = isMockBooked ? 'booked' : (selectedBus?.seats?.[seatNo]?.status || 'available')
    if (status === 'booked') return

    setSelectedSeats((current) =>
      current.includes(seatNo) ? [] : [seatNo]
    )
  }

  const handleConfirmBooking = async () => {
    if (!selectedBus || selectedSeats.length === 0 || !user?.uid) {
      setError('Select a bus and at least one seat before confirming the booking.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const allBookings = [...bookingHistory];
      const hasBookingForSameDay = allBookings.some(
        booking => booking.travelDate === search.travelDate && booking.userId === user.uid && booking.status !== 'cancelled'
      );

      if (hasBookingForSameDay) {
        throw new Error('You already have a booking for this date. Only one booking per day is allowed.');
      }

      let useLocalFallback = firestoreFallbackMode;

      if (!useLocalFallback && !selectedBus.isMock) {
        try {
          await shimApiService.createBooking({
            userId: user.uid,
            userName: user.name || '',
            email: user.email || '',
            busId: selectedBus.id,
            busName: selectedBus.name,
            route: selectedBus.route,
            fromCity: selectedBus.fromCity,
            toCity: selectedBus.toCity,
            seatNumber: selectedSeats.join(', '),
            travelDate: search.travelDate,
            departureTime: DEPARTURE_TIMES[selectedBus.name] || DEPARTURE_TIMES.BIT1,
            status: 'booked'
          })
        } catch (err) {
          if (!err.response && !err.message.includes('already')) {
            useLocalFallback = true; setFirestoreFallbackMode(true);
          } else throw err;
        }
      } else if (!useLocalFallback && selectedBus.isMock) {
        try {
          await shimApiService.updateMockState(search.travelDate, {
            busId: selectedBus.id,
            selectedSeats: selectedSeats
          })
          await shimApiService.createBooking({
            userId: user.uid,
            userName: user.name || '',
            email: user.email || '',
            busId: selectedBus.id,
            busName: selectedBus.name,
            route: selectedBus.route,
            fromCity: selectedBus.fromCity,
            toCity: selectedBus.toCity,
            seatNumber: selectedSeats.join(', '),
            travelDate: search.travelDate,
            departureTime: DEPARTURE_TIMES.BIT1,
            status: 'booked'
          })
        } catch (err) {
          if (!err.response && !err.message.includes('already')) {
            useLocalFallback = true; setFirestoreFallbackMode(true);
          } else throw err;
        }
      }

      if (useLocalFallback) {
        const seatsData = readLocalMockSeats(search.travelDate)
        for (const seatNo of selectedSeats) {
          if ((seatsData[selectedBus.id] || []).includes(seatNo)) {
            throw new Error(`Seat ${seatNo} on ${selectedBus.name} is already booked.`)
          }
        }

        seatsData[selectedBus.id] = [...(seatsData[selectedBus.id] || []), ...selectedSeats]
        writeLocalMockSeats(search.travelDate, seatsData)
        setMockBusSeats(seatsData)

        const nextBooking = {
          bookingId: `local-${Date.now()}`,
          userId: user.uid,
          userName: user.name || '',
          email: user.email || '',
          busId: selectedBus.id,
          busName: selectedBus.name,
          route: selectedBus.route,
          fromCity: selectedBus.fromCity,
          toCity: selectedBus.toCity,
          routePoints: selectedBus.routePoints || TRACKER_ROUTE,
          seatNumber: selectedSeats.join(', '),
          travelDate: search.travelDate,
          departureTime: DEPARTURE_TIMES[selectedBus.name] || DEPARTURE_TIMES.BIT1,
          status: 'booked',
          createdAtTs: Date.now(),
        }

        const allLocalBookings = readLocalBookings()
        const updatedLocalBookings = [...allLocalBookings, nextBooking]
        writeLocalBookings(updatedLocalBookings)

        const mine = updatedLocalBookings
          .filter((item) => item.userId === user.uid)
          .sort((a, b) => (b.createdAtTs || 0) - (a.createdAtTs || 0))
        setBookingHistory(mine)
        setError('Firestore API is disabled. Booking saved locally in this browser.')
      }

      setBookingResult({
        busName: selectedBus.name,
        route: selectedBus.route,
        fromCity: selectedBus.fromCity,
        toCity: selectedBus.toCity,
        routePoints: selectedBus.routePoints || TRACKER_ROUTE,
        seatNumber: selectedSeats.join(', '),
      })
      setRouteIndex(0)
      setSelectedSeats([])
      setActiveTab(TABS.HISTORY)
      setPage(PAGE.CONFIRMATION)
    } catch (err) {
      console.error(err)
      setError(getBookingErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    
    setLoading(true)
    setError('')
    try {
      await shimApiService.cancelBooking(bookingId)
      const res = await shimApiService.getUserBookings(user.uid)
      setBookingHistory(res.data || [])
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.error || 'Cancellation failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (field, value) => {
    setSearch((current) => ({ ...current, [field]: value }))
  }

  const handleSearchBus = () => {
    document.getElementById('bus-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSupportSubmit = (event) => {
    event.preventDefault()
    if (!supportMessage.trim()) return
    setSupportSent(true)
    setSupportMessage('')
  }

  const trackerProgress = (trackerIndex / (TRACKER_ROUTE.length - 1)) * 100

  return (
    <div className="booking-app-showcase bit-dashboard">
      <header className="bit-navbar">
        <div className="bit-branding">
          <div className="bit-mark">BIT</div>
          <div>
            <p className="bit-title">ONLINE CAMPUS BUS BOOKING SYSTEM</p>
            <p className="bit-subtitle-inline">Real-time seat booking and live tracker</p>
          </div>
        </div>

        <nav className="bit-nav">
          <button onClick={onLogout} className="bit-user-chip" type="button">
            {user?.photoURL ? (
              <img className="bit-user-avatar" src={user.photoURL} alt={user?.name || 'User'} referrerPolicy="no-referrer" />
            ) : (
              <span className="bit-user-avatar">{(user?.name || 'BIT').slice(0, 1)}</span>
            )}
            <span>{user?.name || 'Student'}</span>
            <span aria-hidden="true">Logout</span>
          </button>
        </nav>
      </header>

      {error && <p className="error-banner">{error}</p>}
      {supportSent && <p className="success-banner">Support request sent successfully. We will contact you soon.</p>}

      <main className="dashboard-content">
        <section className="summary-grid">
          <article className="summary-card summary-bus">
            <span className="summary-icon">B</span>
            <div>
              <p>Available Buses</p>
              <strong>{availableBuses}</strong>
            </div>
          </article>

          <article className="summary-card summary-seat">
            <span className="summary-icon">S</span>
            <div>
              <p>Seats Available</p>
              <strong>{totalSeatsAvailable}</strong>
            </div>
          </article>

          <article className="summary-card summary-clock">
            <span className="summary-icon">T</span>
            <div>
              <p>Next Bus Departure</p>
              <strong>{nextDeparture}</strong>
            </div>
          </article>

          <button type="button" className="summary-card summary-search" onClick={handleSearchBus}>
            <span>Search Bus</span>
            <strong>-&gt;</strong>
          </button>
        </section>

        <section className="choose-panel">
          <div className="section-heading">
            <h3>Bus Search</h3>
            <span />
          </div>

          <div className="search-bar">
            <select value={search.fromCity} onChange={(event) => handleSearchChange('fromCity', event.target.value)}>
              <option value="All">All Routes</option>
              <option value="Tiruppur">Tiruppur</option>
              <option value="Erode">Erode</option>
              <option value="Salem">Salem</option>
              <option value="Gobi">Gobi</option>
              <option value="Coimbatore">Coimbatore</option>
              <option value="Sathyamangalam">Sathyamangalam</option>
              <option value="Puliyampatti">Puliyampatti</option>
            </select>
            <select value="Campus" disabled title="Destination is fixed to Campus">
              <option value="Campus">Campus</option>
            </select>
            <input
              type="date"
              value={search.travelDate}
              min={getTodayDate()}
              max={getTodayDate()}
              onChange={(event) => handleSearchChange('travelDate', event.target.value)}
              title="Bookings are restricted to today's date only"
            />
            <button className="mock-primary-btn search-button" onClick={handleSearchBus}>
              Search Bus
            </button>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="bus-list-column" id="bus-grid">
            <style>{`
              .custom-bus-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 10px 0; }
              .custom-bus-card { background: #ffffff; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; display: flex; flex-direction: column; gap: 16px; position: relative; overflow: hidden; }
              .custom-bus-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, #3b82f6, #10b981); opacity: 0; transition: opacity 0.3s ease; }
              .custom-bus-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border-color: #cbd5e1; }
              .custom-bus-card:hover::before { opacity: 1; }
              .custom-bus-header { display: flex; justify-content: space-between; align-items: flex-start; }
              .custom-bus-title { display: flex; align-items: center; gap: 12px; }
              .custom-bus-icon { font-size: 28px; background: #eff6ff; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 14px; }
              .custom-bus-name { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
              .custom-bus-number { color: #64748b; font-size: 0.85rem; font-weight: 500; margin-top: 2px; }
              .custom-status-badge { background: #ecfdf5; color: #059669; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; padding: 6px 12px; border-radius: 100px; letter-spacing: 0.05em; border: 1px solid #a7f3d0; }
              .custom-status-badge.full { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
              .custom-bus-route { padding: 16px 0; border-top: 1px dashed #e2e8f0; border-bottom: 1px dashed #e2e8f0; color: #475569; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 10px; }
              .custom-route-arrow { color: #3b82f6; }
              .custom-book-btn { background: #f8fafc; color: #3b82f6; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
              .custom-book-btn:hover { background: #3b82f6; color: #ffffff; border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
            `}</style>
            <div className="custom-bus-grid">
              {[
                { id: 'BITNO1', from: 'Tiruppur' },
                { id: 'BITNO2', from: 'Salem' },
                { id: 'BITNO3', from: 'Erode' },
                { id: 'BITNO4', from: 'Gobi' },
                { id: 'BITNO5', from: 'Coimbatore' },
                { id: 'BITNO6', from: 'Puliyampatti' }
              ].filter((bus) => search.fromCity === 'All' || bus.from === search.fromCity).map((bus) => (
                <div key={bus.id} className="custom-bus-card" onClick={() => openBusBooking(bus.id)}>
                  <div className="custom-bus-header">
                    <div className="custom-bus-title">
                      <div className="custom-bus-icon">🚌</div>
                      <div>
                        <h4 className="custom-bus-name">Bus {bus.id}</h4>
                        <div className="custom-bus-number">{45 - (mockBusSeats[bus.id]?.length || 0)} Seats Left</div>
                      </div>
                    </div>
                    <span className={`custom-status-badge ${(mockBusSeats[bus.id]?.length || 0) >= 45 ? 'full' : ''}`}>
                      {(mockBusSeats[bus.id]?.length || 0) >= 45 ? 'Full' : 'Available'}
                    </span>
                  </div>
                  <div className="custom-bus-route">
                    <span style={{ fontSize: '1.1rem' }}>📍</span>
                    <span>{bus.from}</span>
                    <span className="custom-route-arrow">→</span>
                    <span>College</span>
                  </div>
                  <button className="custom-book-btn" onClick={(e) => { e.stopPropagation(); openBusBooking(bus.id); }}>
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          </div>

          <aside className="tracker-column">
            <section className="tracker-panel">
              <div className="tracker-header">
                <h3>Live Bus Tracker</h3>
              </div>
              <div className="tracker-map">
                <div className="tracker-route-line" />
                <div className="tracker-mover" style={{ top: `${20 + trackerProgress * 1.9}px` }} />
                <div className={`tracker-pin tracker-pin-start ${trackerIndex === 0 ? 'is-active' : ''}`}>Campus</div>
                <div className={`tracker-pin tracker-pin-mid ${trackerIndex === 1 ? 'is-active' : ''}`}>Sathyamangalam</div>
                <div className={`tracker-pin tracker-pin-end ${trackerIndex === 2 ? 'is-active' : ''}`}>Erode</div>
              </div>
              <div className="tracker-footer" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="tracker-bus-icon">B</div>
                  <div>
                    <strong>Bus BIT3 - Currently on the way</strong>
                    <p>Active stop: {TRACKER_ROUTE[trackerIndex]}</p>
                  </div>
                </div>
                <a 
                  href="https://www.google.com/maps/dir/?api=1&destination=Bannari+Amman+Institute+of+Technology,+Sathyamangalam" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="mock-primary-btn" 
                  style={{ textDecoration: 'none', textAlign: 'center', marginTop: '12px' }}
                >
                  Track on Google Maps
                </a>
              </div>
            </section>
          </aside>
        </section>

        <section className="bottom-tabs">
          <button type="button" className={activeTab === TABS.HISTORY ? 'is-active' : ''} onClick={() => setActiveTab(TABS.HISTORY)}>
            Booking History
          </button>
          <button type="button" className={activeTab === TABS.SCHEDULE ? 'is-active' : ''} onClick={() => setActiveTab(TABS.SCHEDULE)}>
            Bus Schedule
          </button>
          <button type="button" className={activeTab === TABS.SUPPORT ? 'is-active' : ''} onClick={() => setActiveTab(TABS.SUPPORT)}>
            Support & Help
          </button>
        </section>

        {activeTab === TABS.HISTORY ? (
          <section className="tab-panel">
            <h3>My Booking History</h3>
            {bookingHistory.length === 0 ? (
              <p className="tiny-text dark">No previous bookings found.</p>
            ) : (
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Bus Number</th>
                      <th>Date</th>
                      <th>Route</th>
                      <th>Seat Number</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingHistory.map((item) => (
                      <tr key={item._id || item.bookingId}>
                        <td>{normalizeBusNumber(item.busName || item.busId)}</td>
                        <td>{bookingDateText(item.createdAt, item.travelDate)}</td>
                        <td>{item.fromCity} -&gt; {item.toCity}</td>
                        <td>{item.seatNumber}</td>
                        <td>
                          <span className={`status-pill status-${String(item.status || 'booked').toLowerCase()}`}>
                            {item.status || 'booked'}
                          </span>
                        </td>
                        <td>
                          {(item.status === 'booked' || item.status === 'confirmed') ? (
                            <button 
                              className="mini-cancel-btn" 
                              onClick={() => handleCancelBooking(item._id || item.bookingId)}
                              disabled={loading}
                            >
                              {loading ? '...' : 'Cancel'}
                            </button>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        <style>{`
          .mini-cancel-btn {
            background: #ffe4e6;
            color: #e11d48;
            border: 1px solid #fecdd3;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
          }
          .mini-cancel-btn:hover {
            background: #e11d48;
            color: #ffffff;
            border-color: #e11d48;
          }
        `}</style>

        {activeTab === TABS.SCHEDULE ? (
          <section className="tab-panel">
            <h3>Bus Schedule</h3>
            <p className="tiny-text dark">Filtered by route {search.fromCity} -&gt; {search.toCity} and date {formatDate(search.travelDate)}.</p>
            <div className="schedule-grid">
              {filteredBuses.map((bus) => (
                <article key={`schedule-${bus.id}`} className="schedule-card">
                  <strong>{bus.name}</strong>
                  <p>{bus.fromCity} -&gt; {bus.toCity}</p>
                  <p>Departure: {DEPARTURE_TIMES[bus.name] || DEPARTURE_TIMES.BIT1}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === TABS.SUPPORT ? (
          <section className="tab-panel">
            <h3>Support & Help</h3>
            <div className="support-layout">
              <div className="faq-card">
                <h4>FAQ</h4>
                <p><strong>How do I book a seat?</strong> Select a bus and click Book Seat.</p>
                <p><strong>Can I see live location?</strong> Yes, the tracker updates in real time.</p>
                <p><strong>What if seat is already booked?</strong> You will see a clear error and can pick another seat.</p>
              </div>
              <form className="support-form" onSubmit={handleSupportSubmit}>
                <label htmlFor="support-msg">Message</label>
                <textarea
                  id="support-msg"
                  rows="4"
                  value={supportMessage}
                  onChange={(event) => setSupportMessage(event.target.value)}
                  placeholder="Describe your issue..."
                />
                <button className="mock-primary-btn" type="submit">
                  Send Message
                </button>
              </form>
            </div>
          </section>
        ) : null}
      </main>

      {page === PAGE.SEATS || page === PAGE.CONFIRMATION ? (
        <section className={`seat-modal ${page === PAGE.CONFIRMATION ? 'show-confirmed' : ''}`}>
          <div className="seat-modal-inner">
            <div className="phone-coral compact-top seat-modal-head">
              <p className="tiny-text">Select your seat</p>
              <h3>{selectedBus ? `${selectedBus.name} seat booking` : 'Select a bus first'}</h3>
              <button className="seat-close-btn" onClick={() => setPage(PAGE.DASHBOARD)}>
                Close
              </button>
            </div>

            <div className="phone-body">
              {error && <p className="error-banner" style={{ marginTop: '0', marginBottom: '14px' }}>{error}</p>}
              {selectedBus ? (
                <>
                  <div className="booking-slot-summary">
                    <div>
                      <p className="tiny-pill inline-pill">Seat Selection</p>
                      <h4>{selectedBus.name}</h4>
                      <p>
                        {selectedBus.fromCity} -&gt; {selectedBus.toCity}
                      </p>
                    </div>
                    <div className="slot-availability">
                      <span>{selectedBus?.isMock ? (45 - (mockBusSeats[selectedBus.id]?.length || 0)) : getSeatsLeft(selectedBus)} seats left</span>
                      <button className="mini-link" onClick={() => setPage(PAGE.DASHBOARD)}>
                        Back to dashboard
                      </button>
                    </div>
                  </div>

                  <div className="redbus-layout">
                    <style>{`
                      .redbus-layout {
                        background: #ffffff;
                        border-radius: 12px;
                        padding: 24px;
                        border: 1px solid #e5e7eb;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        margin-top: 10px;
                        margin-bottom: 20px;
                      }
                      .redbus-legend {
                        display: flex;
                        justify-content: space-between;
                        width: 100%;
                        max-width: 350px;
                        margin-bottom: 24px;
                        color: #6b7280;
                        font-size: 0.85rem;
                        font-weight: 500;
                      }
                      .legend-item { display: flex; align-items: center; gap: 8px; }
                      .legend-box { width: 22px; height: 22px; border-radius: 6px; }
                      .bg-booked { background-color: #fca5a5; }
                      .bg-available { background-color: #d1d5db; }
                      .bg-selected { background-color: #f59e0b; }
                      
                      .steering-wheel {
                        width: 100%;
                        display: flex;
                        justify-content: flex-end;
                        padding-right: 15px;
                        margin-bottom: 10px;
                        font-size: 24px;
                      }

                      .main-deck {
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        padding-top: 10px;
                      }

                      .aisle-text {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%) rotate(-90deg);
                        color: #f3f4f6;
                        font-weight: 800;
                        font-size: 1.8rem;
                        letter-spacing: 6px;
                        white-space: nowrap;
                        pointer-events: none;
                      }

                      .seat-grid-half {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                      }
                      
                      .column-labels {
                        display: flex;
                        gap: 18px;
                        margin-bottom: 16px;
                        color: #9ca3af;
                        font-size: 0.85rem;
                        font-weight: 600;
                      }
                      .column-label {
                        width: 45px;
                        text-align: center;
                      }

                      .seat-row-pair {
                        display: flex;
                        gap: 18px;
                      }

                      .redbus-seat {
                        width: 45px;
                        height: 45px;
                        border-radius: 8px;
                        border: none;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-size: 0;
                      }
                      .redbus-seat:hover:not(.seat-booked) {
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        transform: translateY(-2px);
                      }
                      .seat-booked { background-color: #fca5a5; cursor: not-allowed; }
                      .seat-available { background-color: #d1d5db; }
                      .seat-selected { background-color: #f59e0b; }
                    `}</style>

                    <div className="redbus-legend">
                      <div className="legend-item"><div className="legend-box bg-booked"></div> Booked</div>
                      <div className="legend-item"><div className="legend-box bg-available"></div> Available</div>
                      <div className="legend-item"><div className="legend-box bg-selected"></div> Your Seat</div>
                    </div>

                    <div className="steering-wheel">
                      <span>🛞</span>
                    </div>

                    <div className="main-deck">
                      <div className="aisle-text" style={{ top: '40%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}>LOWER DECK</div>

                      <div style={{ display: 'flex', gap: '50px' }}>
                        {/* Left Half (A, B) */}
                        <div className="seat-grid-half">
                          <div className="column-labels"><div className="column-label">A</div><div className="column-label">B</div></div>
                          {Array.from({ length: 10 }).map((_, rowIndex) => {
                            const seatsLeft = [seatNumbers[rowIndex * 4], seatNumbers[rowIndex * 4 + 1]];
                            return (
                              <div className="seat-row-pair" key={`left-row-${rowIndex}`}>
                                {seatsLeft.map((seatNo, idx) => {
                                  if (!seatNo) return <div key={`empty-l-${idx}`} style={{ width: 45 }}></div>;
                                  const isMockBooked = mockBusSeats[selectedBus.id]?.includes(seatNo);
                                  let status = isMockBooked ? 'booked' : (selectedBus?.seats?.[seatNo]?.status || 'available');
                                  if (selectedSeats.includes(seatNo)) status = 'selected';
                                  return (
                                    <button
                                      key={seatNo}
                                      className={`redbus-seat seat-${status}`}
                                      disabled={status === 'booked'}
                                      onClick={() => handleSeatClick(seatNo)}
                                      title={`Seat ${seatNo}`}
                                    >
                                      {seatNo}
                                    </button>
                                  );
                                })}
                              </div>
                            )
                          })}
                        </div>

                        {/* Right Half (C, D) */}
                        <div className="seat-grid-half">
                          <div className="column-labels"><div className="column-label">C</div><div className="column-label">D</div></div>
                          {Array.from({ length: 10 }).map((_, rowIndex) => {
                            const seatsRight = [seatNumbers[rowIndex * 4 + 2], seatNumbers[rowIndex * 4 + 3]];
                            return (
                              <div className="seat-row-pair" key={`right-row-${rowIndex}`}>
                                {seatsRight.map((seatNo, idx) => {
                                  if (!seatNo) return <div key={`empty-r-${idx}`} style={{ width: 45 }}></div>;
                                  const isMockBooked = mockBusSeats[selectedBus.id]?.includes(seatNo);
                                  let status = isMockBooked ? 'booked' : (selectedBus?.seats?.[seatNo]?.status || 'available');
                                  if (selectedSeats.includes(seatNo)) status = 'selected';
                                  return (
                                    <button
                                      key={seatNo}
                                      className={`redbus-seat seat-${status}`}
                                      disabled={status === 'booked'}
                                      onClick={() => handleSeatClick(seatNo)}
                                      title={`Seat ${seatNo}`}
                                    >
                                      {seatNo}
                                    </button>
                                  );
                                })}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Last Row (5 seats) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '16px' }}>
                        {Array.from({ length: 5 }).map((_, idx) => {
                          const seatNo = seatNumbers[40 + idx];
                          if (!seatNo) return <div key={`empty-b-${idx}`} style={{ width: 45 }}></div>;
                          const isMockBooked = mockBusSeats[selectedBus.id]?.includes(seatNo);
                          let status = isMockBooked ? 'booked' : (selectedBus?.seats?.[seatNo]?.status || 'available');
                          if (selectedSeats.includes(seatNo)) status = 'selected';
                          return (
                            <button
                              key={seatNo}
                              className={`redbus-seat seat-${status}`}
                              disabled={status === 'booked'}
                              onClick={() => handleSeatClick(seatNo)}
                              title={`Seat ${seatNo}`}
                            >
                              {seatNo}
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  </div>

                  <div className="booking-footer compact-footer">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>
                        Selected: <strong>{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}</strong>
                      </p>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Seats: {selectedSeats.length}</span>
                    </div>
                    <button className="mock-primary-btn" disabled={selectedSeats.length === 0 || loading} onClick={handleConfirmBooking}>
                      {loading ? 'Confirming...' : 'Confirm Booking'}
                    </button>
                  </div>

                  {bookingResult ? (
                    <div className="tracker-card small-tracker">
                      <h4>Booking Successful</h4>
                      <p>
                        {bookingResult.busName} - Seat {bookingResult.seatNumber}
                      </p>
                      <p>
                        {bookingResult.fromCity} -&gt; {bookingResult.toCity}
                      </p>
                      <p>Current stop: {bookingResult.routePoints[routeIndex] || bookingResult.fromCity}</p>
                      <a 
                        href="https://www.google.com/maps/dir/?api=1&destination=Bannari+Amman+Institute+of+Technology,+Sathyamangalam" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="mock-primary-btn" 
                        style={{ textDecoration: 'none', textAlign: 'center', display: 'block', marginTop: '12px' }}
                      >
                        Track on Google Maps
                      </a>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="empty-state">
                  <p>Select a bus first.</p>
                  <button className="mock-primary-btn" onClick={() => setPage(PAGE.DASHBOARD)}>
                    Go to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
