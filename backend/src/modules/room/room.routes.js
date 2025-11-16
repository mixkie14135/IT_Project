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

// ********** 1. ประเภทห้อง (Routes ที่เจาะจงมาก่อน Route ทั่วไป) **********
router.get('/room-types', getRoomTypes); // /api/room-types
router.post('/room-types', createRoomType);
router.get('/room-types/slug/:slug', getRoomTypeBySlug); // /api/room-types/slug/:slug

// ********** 2. Route ค้นหาและตรวจสอบว่าง (เฉพาะเจาะจง) **********
// ต้องมาก่อน /:id เพื่อไม่ให้ 'available' ถูกมองเป็น ID
router.get('/available', getAvailableRooms); // /api/rooms/available
router.get('/:id/availability', getRoomAvailability); // /api/rooms/:id/availability

// ********** 3. Route ห้องเดี่ยวและรายการทั้งหมด **********
// อ่านห้องตาม id (Route Detail)
router.get('/:id', getRoom); // /api/rooms/:id
// อ่านห้องทั้งหมด (Route List - ต้องอยู่ท้ายสุดในกลุ่มนี้)
router.get('/', getRooms); // /api/rooms

// ********** 4. สร้าง / แก้ไข / ลบ (Route ที่ใช้ Controller ที่เหลือ) **********
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);
// NOTE: ลบ router.get('/room-types/:slug', getRoomTypeBySlug); ซ้ำซ้อนออก

module.exports = router;