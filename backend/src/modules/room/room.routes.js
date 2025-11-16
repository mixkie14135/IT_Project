const express = require('express');
const {
  getRooms,
  getRoom,
  getAvailableRooms,
  getRoomAvailability,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomTypes,
  createRoomType,
  getRoomTypeBySlug,
} = require('../room/room.controller.js');

const router = express.Router();

// ********** Room Types **********
router.get('/room-types', getRoomTypes);
router.post('/room-types', createRoomType);
router.get('/room-types/slug/:slug', getRoomTypeBySlug);

// ********** Room Availability / Search **********
router.get('/available', getAvailableRooms);
router.get('/:id/availability', getRoomAvailability);

// ********** Room Detail / List **********
router.get('/:id', getRoom);   // Detail
router.get('/', getRooms);     // List

// ********** CRUD Rooms **********
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

module.exports = router;
