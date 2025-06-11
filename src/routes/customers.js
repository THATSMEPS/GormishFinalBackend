const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const validate = require('../middleware/validation');

// Validation middleware
const customerUpdateValidation = [
  body('name').optional().trim().notEmpty(),
  body('phone').optional().matches(/^[0-9]{10}$/),
  body('address').optional(),
  body('areaId').optional().notEmpty()
];

// Routes
// router.get('/', authenticateToken, customerController.getCustomers);
router.get('/', customerController.getCustomers);
router.get('/:id', authenticateToken, customerController.getCustomerById);
// router.get('/:id', customerController.getCustomerById);
router.put('/:id', authenticateToken, customerUpdateValidation, validate, customerController.updateCustomer);
// router.put('/:id', customerUpdateValidation, validate, customerController.updateCustomer);
// router.delete('/:id', authenticateToken, customerController.deleteCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
