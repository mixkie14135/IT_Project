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

// ---- เส้นคงที่/ค้นหา รวมหลายห้อง (มาก่อน :๐id)
router.get('/', getBanquets);
router.get('/available', getAvailableBanquets);

// ---- รายห้อง + availability
router.get('/:id', getBanquet);
router.get('/:id/availability', getBanquetAvailability);

// ---- สร้าง/แก้/ลบ
router.post('/', createBanquet);
router.put('/:id', updateBanquet);
router.delete('/:id', deleteBanquet);

module.exports = router;
