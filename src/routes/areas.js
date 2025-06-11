const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');
const { body } = require('express-validator');
const validate = require('../middleware/validation');

// Validation middleware
const areaValidation = [
  body('pincode').isInt(),
  body('areaName').notEmpty(),
  body('cityName').notEmpty(),
  body('latitude').isFloat(),
  body('longitude').isFloat()
];

// Routes
router.get('/', areaController.getAreas);
router.get('/:id', areaController.getAreaById);
router.post('/', areaValidation, validate, areaController.createArea);
router.put('/:id', areaValidation, validate, areaController.updateArea);

module.exports = router;
