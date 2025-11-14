require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const { UPLOAD_ROOT, SLIP_DIR } = require('./utils/uploadPaths');

// Import routes
const adminRoutes = require('./modules/admin/admin.routes.js');
const roomRoutes = require('./modules/room/room.routes.js');
const banquetRoutes = require('./modules/banquet/banquet.routes.js');
const reservationRoomRoutes = require('./modules/reservation/room/reservationRoom.routes');
const reservationBanquetRoutes = require('./modules/reservation/banquet/reservationBanquet.routes');
const reservationResolveRoutes = require('./modules/reservation/resolve.routes');
const roomImageRoutes = require('./modules/room/image/roomImage.routes');
const banquetImageRoutes = require('./modules/banquet/image/banquetImage.routes');
const paymentRoutes = require('./modules/payment/payment.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const { publicRateLimit } = require("./middlewares/ratelimit");

const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

/* ===== Essentials ===== */
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

/* ===== Minimal logger ===== */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

/* ===== JSON header for all /api ===== */
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

/* ===== Healthcheck ===== */
app.get('/api/ping', (_req, res) => res.json({ message: 'API is working!' }));

/* ===== Serve uploads ===== */
app.use('/uploads', express.static(UPLOAD_ROOT));

/* ===== Public rate limit ===== */
app.use('/api/reservations', publicRateLimit);
app.use('/api/reservations/room/status', publicRateLimit);
app.use('/api/room/reservations/status', publicRateLimit);
app.use('/api/reservations/banquet/status', publicRateLimit);
app.use('/api/reservations/resolve', publicRateLimit);

/* ===== Mount routes ===== */
app.use('/api', adminRoutes);
app.use('/api', roomRoutes);
app.use('/api', banquetRoutes);
app.use('/api', reservationRoomRoutes);
app.use('/api', reservationBanquetRoutes);
app.use('/api', reservationResolveRoutes);
app.use('/api', roomImageRoutes);
app.use('/api', banquetImageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', dashboardRoutes);

/* ===== 404 สำหรับ /api ===== */
app.use('/api', (req, res) => {
  res.status(404).json({ status: 'error', message: 'API route not found' });
});

/* ===== Root route & favicon ===== */
app.get('/', (_req, res) => {
  res.json({ message: 'Backend is running' });
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

/* ===== Export app สำหรับ Vercel ===== */
module.exports = app;
