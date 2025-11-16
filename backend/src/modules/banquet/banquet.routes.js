// backend/src/modules/banquet/banquet.routes.js
const express = require('express');
const {
  getBanquets,
  getBanquet,
  getAvailableBanquets,
  getBanquetAvailability,
  createBanquet,
  updateBanquet,
  deleteBanquet
} = require('../banquet/banquet.controller.js');

const router = express.Router();

// ---- Route List (รับ Path /api/banquets)
router.get('/', getBanquets);

// ---- Route ที่เจาะจง (มาก่อน /:id)
router.get('/available', getAvailableBanquets); // /api/banquets/available

// ---- รายห้อง + availability
router.get('/:id/availability', getBanquetAvailability); // /api/banquets/:id/availability
router.get('/:id', getBanquet); // /api/banquets/:id

// ---- สร้าง/แก้/ลบ
router.post('/', createBanquet);
router.put('/:id', updateBanquet);
router.delete('/:id', deleteBanquet);

module.exports = router;