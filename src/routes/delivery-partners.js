const express = require('express');
const router = express.Router();
const deliveryPartnerController = require('../controllers/deliveryPartnerController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validation');

// Validation middleware
const dpValidation = [
  body('mobile').notEmpty(),
  body('name').notEmpty(),
  body('gender').isIn(['male', 'female', 'other']),
  body('dateOfBirth').isISO8601(),
  body('vehicleType').isIn(['ev', 'bike', 'scooter', 'bicycle']),
  body('homeAddress').notEmpty()
];

const locationValidation = [
  body('latitude').isFloat(),
  body('longitude').isFloat()
];

const statusValidation = [
  body('status').isIn(['approved', 'pending', 'rejected', 'suspended'])
];

// Routes
// router.get('/', authenticateToken, deliveryPartnerController.getDeliveryPartners);
router.get('/', deliveryPartnerController.getDeliveryPartners);
// router.get('/:id', authenticateToken, deliveryPartnerController.getDeliveryPartnerById);
router.get('/:id', deliveryPartnerController.getDeliveryPartnerById);
router.post('/', dpValidation, validate, deliveryPartnerController.createDeliveryPartner);
// router.patch('/:id/status', authenticateToken, statusValidation, validate, deliveryPartnerController.updateDeliveryPartnerStatus);
router.patch('/:id/status', statusValidation, validate, deliveryPartnerController.updateDeliveryPartnerStatus);
// router.patch('/:id/location', authenticateToken, locationValidation, validate, deliveryPartnerController.updateLiveLocation);
router.patch('/:id/location', locationValidation, validate, deliveryPartnerController.updateLiveLocation);

module.exports = router;
