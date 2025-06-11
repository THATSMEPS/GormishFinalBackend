const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validation');

// Validation middleware
const menuItemValidation = [
  body('name').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('cuisine').trim().notEmpty(),
  body('restaurantId').trim().notEmpty(),
  body('packagingCharges').isFloat({ min: 0 }),
  body('isVeg').optional().isBoolean()
];

// Validation middleware for update (exclude restaurantId)
const menuItemUpdateValidation = [
  body('name').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('cuisine').trim().notEmpty(),
  body('packagingCharges').isFloat({ min: 0 }),
  body('isVeg').optional().isBoolean()
];

// Routes
router.get('/restaurant/:restaurantId', menuController.getMenuByRestaurantId);
router.post('/', authenticateToken, menuItemValidation, validate, menuController.createMenuItem);
router.put('/:id', authenticateToken, menuItemUpdateValidation, validate, menuController.updateMenuItem);
router.delete('/:id', authenticateToken, menuController.deleteMenuItem);
router.get('/:id', menuController.getMenuItemById);

module.exports = router;
