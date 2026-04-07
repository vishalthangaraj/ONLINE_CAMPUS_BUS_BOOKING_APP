// Sample bus and route data for CampusRide
export const SAMPLE_BUSES = [
  {
    _id: 'bus_101',
    busNumber: 101,
    route: 'Campus → City Center',
    fromLocation: 'Campus Main Gate',
    toLocation: 'City Center',
    capacity: 40,
    icon: '🚌',
    trips: [
      { startTime: '08:30', endTime: '09:00', availableSeats: 12, bookedCount: 28 },
      { startTime: '10:30', endTime: '11:00', availableSeats: 8, bookedCount: 32 },
      { startTime: '14:30', endTime: '15:00', availableSeats: 15, bookedCount: 25 },
    ]
  },
  {
    _id: 'bus_102',
    busNumber: 102,
    route: 'Campus → Railway Station',
    fromLocation: 'Campus Main Gate',
    toLocation: 'Railway Station',
    capacity: 40,
    icon: '🚌',
    trips: [
      { startTime: '09:00', endTime: '09:45', availableSeats: 20, bookedCount: 20 },
      { startTime: '12:00', endTime: '12:45', availableSeats: 5, bookedCount: 35 },
      { startTime: '16:00', endTime: '16:45', availableSeats: 18, bookedCount: 22 },
    ]
  },
  {
    _id: 'bus_103',
    busNumber: 103,
    route: 'Campus → Bus Stand',
    fromLocation: 'Campus Main Gate',
    toLocation: 'Main Bus Stand',
    capacity: 40,
    icon: '🚌',
    trips: [
      { startTime: '09:30', endTime: '10:15', availableSeats: 0, bookedCount: 40 },
      { startTime: '13:30', endTime: '14:15', availableSeats: 10, bookedCount: 30 },
      { startTime: '17:30', endTime: '18:15', availableSeats: 25, bookedCount: 15 },
    ]
  },
  {
    _id: 'bus_104',
    busNumber: 104,
    route: 'Campus → Airport',
    fromLocation: 'Campus Main Gate',
    toLocation: 'International Airport',
    capacity: 40,
    icon: '✈️',
    trips: [
      { startTime: '10:00', endTime: '11:00', availableSeats: 30, bookedCount: 10 },
      { startTime: '15:00', endTime: '16:00', availableSeats: 22, bookedCount: 18 },
      { startTime: '18:00', endTime: '19:00', availableSeats: 35, bookedCount: 5 },
    ]
  },
  {
    _id: 'bus_105',
    busNumber: 105,
    route: 'Campus → Hospital',
    fromLocation: 'Campus Main Gate',
    toLocation: 'City Hospital',
    capacity: 40,
    icon: '🏥',
    trips: [
      { startTime: '08:00', endTime: '08:30', availableSeats: 16, bookedCount: 24 },
      { startTime: '11:00', endTime: '11:30', availableSeats: 8, bookedCount: 32 },
      { startTime: '15:00', endTime: '15:30', availableSeats: 12, bookedCount: 28 },
    ]
  },
  {
    _id: 'bus_106',
    busNumber: 106,
    route: 'Campus → Shopping Mall',
    fromLocation: 'Campus Main Gate',
    toLocation: 'Central Shopping Mall',
    capacity: 40,
    icon: '🛍️',
    trips: [
      { startTime: '10:00', endTime: '10:45', availableSeats: 18, bookedCount: 22 },
      { startTime: '13:00', endTime: '13:45', availableSeats: 7, bookedCount: 33 },
      { startTime: '17:00', endTime: '17:45', availableSeats: 20, bookedCount: 20 },
    ]
  },
]

export const DUMMY_ROUTES = [
  {
    _id: 'route_1',
    name: 'Campus to City Center',
    startStop: 'Main Campus Gate',
    endStop: 'City Center Bus Stand',
  },
  {
    _id: 'route_2',
    name: 'Campus to Railway Station',
    startStop: 'Main Campus Gate',
    endStop: 'Central Railway Station',
  },
  {
    _id: 'route_3',
    name: 'Campus to Airport',
    startStop: 'Main Campus Gate',
    endStop: 'International Airport',
  },
]
