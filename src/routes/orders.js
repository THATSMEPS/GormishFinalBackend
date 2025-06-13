const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validation');

// Validation middleware
const createOrderValidation = [
  body('restaurantId').notEmpty(),
  body('items').isArray().notEmpty(),
  body('items.*.menuItemId').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('paymentType').isIn(['COD', 'ONLINE']),
  body('address').optional().isObject()
];

const updateStatusValidation = [
  body('status').isIn([
    'pending',
    'preparing',
    'ready',
    'dispatch',
    'delivered',
    'cancelled',
    'rejected'
  ])
];


router.get('/', orderController.getOrders);
router.get('/getOrdersByReadyStatus', orderController.getOrdersByReadyStatus);
router.get('/:id', orderController.getOrderById);
router.post('/', authenticateToken, createOrderValidation, validate, orderController.createOrder);
router.patch('/:id/status', updateStatusValidation, validate, orderController.updateOrderStatus);
router.get('/customer/:customerId', authenticateToken, orderController.getCustomerOrders);
router.get('/restaurant/:restaurantId', orderController.getRestaurantOrders);
router.get('/restaurant/:restaurantId/history', authenticateToken, orderController.getRestaurantOrderHistory);
router.get('/delivery-partner/:dpId', orderController.getDeliveryPartnerOrders);

module.exports = router;
