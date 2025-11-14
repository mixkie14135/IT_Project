const express = require('express');
const {
  createReservationRoom,
  getReservationRoomStatusByCode,
  // Admin
  getReservationRooms,
  getReservationRoom,
  updateReservationRoom,
  deleteReservationRoom
} = require('./reservationRoom.controller');

const { requireAdminAuth } = require('../../../middlewares/authAdmin');
const rateLimit = require('express-rate-limit');

const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

/* ===== Public (ลูกค้า) ===== */
router.post('/reservations/room', createReservationRoom);

router.get('/reservations/room/status', statusLimiter, getReservationRoomStatusByCode);
// alias
router.get('/room/reservations/status', statusLimiter, getReservationRoomStatusByCode);

/* ===== Admin ===== */
router.get('/reservations/room', requireAdminAuth, getReservationRooms);
router.get('/reservations/room/:id', requireAdminAuth, getReservationRoom);
router.put('/reservations/room/:id', requireAdminAuth, updateReservationRoom);
router.delete('/reservations/room/:id', requireAdminAuth, deleteReservationRoom);

module.exports = router;
