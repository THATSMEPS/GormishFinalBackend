const express = require('express');
const router = express.Router();
const deliveryPartnerController = require('../controllers/deliveryPartnerController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validation');

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

router.get('/', deliveryPartnerController.getDeliveryPartners);
router.get('/:id', deliveryPartnerController.getDeliveryPartnerById);
router.patch('/:id/status', statusValidation, validate, deliveryPartnerController.updateDeliveryPartnerStatus);
router.patch('/:id/location', locationValidation, validate, deliveryPartnerController.updateLiveLocation);
router.post('/', dpValidation, validate, deliveryPartnerController.createDeliveryPartner);
router.post('/loginDeliveryPartner', validate, deliveryPartnerController.loginDeliveryPartner);
router.patch('/acceptOrder', validate, deliveryPartnerController.acceptOrder)
router.patch('/completeOrder', validate, deliveryPartnerController.completeOrder)
router.patch('/islive/:id', validate, deliveryPartnerController.updateDeliveryPartnerIsLive);
router.get('/myorders/:dpId', deliveryPartnerController.getDeliveryPartnerOrders); 

module.exports = router;

