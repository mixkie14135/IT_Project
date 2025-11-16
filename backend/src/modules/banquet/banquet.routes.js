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

// ---- List
router.get('/', getBanquets);

// ---- Available (ต้องมาก่อน /:id)
router.get('/available', getAvailableBanquets);

// ---- Detail + availability
router.get('/:id/availability', getBanquetAvailability);
router.get('/:id', getBanquet);

// ---- CRUD
router.post('/', createBanquet);
router.put('/:id', updateBanquet);
router.delete('/:id', deleteBanquet);

module.exports = router;
