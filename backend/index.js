require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');
const { setupSocket } = require('./socket');

const authRoutes = require('./routes/auth');
const routeRoutes = require('./routes/routes');
const feedbackRoutes = require('./routes/feedback');
const plannerRoutes = require('./routes/planner');
const safetyRoutes = require('./routes/safety');
const attendanceRoutes = require('./routes/attendance');
const createBookingRouter = require('./routes/bookings');
const busesRoutes = require('./routes/buses');
const tripsRoutes = require('./routes/trips');
const adminRoutes = require('./routes/admin');
const shimRoutes = require('./routes/shim');

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  await connectDB(MONGO_URI);

  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: '*', 
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },
  });

  setupSocket(io);

  // Middleware: CORS and JSON body parser (must be before routes)
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // ----- 1. Root route: so GET http://localhost:4000/ returns a valid response -----
  app.get('/', (req, res) => {
    res.type('application/json');
    res.status(200).json({
      message: 'Campus Bus Booking API',
      docs: 'API is running. Use the frontend or these endpoints:',
      health: `http://localhost:${PORT}/api/health`,
      apiBase: `http://localhost:${PORT}/api`,
    });
  });

  // Health check (for load balancers / monitoring)
  app.get('/api/health', (req, res) => {
    res.type('application/json');
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/routes', routeRoutes);
  app.use('/api/bookings', createBookingRouter(io));
  app.use('/api/buses', busesRoutes);
  app.use('/api/trips', tripsRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/planner', plannerRoutes);
  app.use('/api/safety', safetyRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/shim', shimRoutes(io));

  // 404 handler: ensures every unknown path gets a valid JSON response
  app.use((req, res) => {
    res.type('application/json');
    res.status(404).json({ error: 'Not Found', path: req.path });
  });

  // Error handler: prevents uncaught errors from sending invalid response
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.type('application/json');
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // Use server.listen (not app.listen) so Socket.IO works; bind to HOST
  server.listen(Number(PORT), HOST, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`Root route: http://localhost:${PORT}/`);
  });
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
