// backend/src/modules/room/room.routes.js
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

// อ่านห้องทั้งหมด
router.get('/', getRooms);
// ค้นหาห้องว่างตามช่วงวัน
router.get('/available', getAvailableRooms);
// ตรวจสอบห้องว่างตาม id และช่วงวัน
router.get('/:id/availability', getRoomAvailability);
// อ่านห้องตาม id
router.get('/:id', getRoom);
// สร้าง / แก้ไข / ลบ
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);
// ประเภทห้อง
router.get('/room-types', getRoomTypes);
router.post('/room-types', createRoomType);
router.get('/room-types/:slug', getRoomTypeBySlug);
router.get('/room-types/slug/:slug', getRoomTypeBySlug);





module.exports = router;
