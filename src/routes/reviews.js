const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { body } = require('express-validator');
const validate = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Validation middleware
const reviewValidation = [
  body('orderId').notEmpty(),
  body('reviewText').trim().notEmpty(),
  body('customerId').notEmpty().isString().withMessage('Customer ID is required and must be a string.')
];

// Routes
// router.get('/', authenticateToken, reviewController.getReviews);
router.get('/', reviewController.getReviews);
router.get('/:id', authenticateToken, reviewController.getReviewsByCustomerId);
// router.get('/:id', reviewController.getReviewsByCustomerId);
// router.get('/:id', authenticateToken, reviewController.getReviewsByRestaurantId);
router.get('/restuarant/:id', reviewController.getReviewsByRestaurantId);
router.post('/', authenticateToken, reviewValidation, validate, reviewController.createReview);
// router.post('/', reviewValidation, validate, reviewController.createReview);
router.put('/:id', authenticateToken, body('reviewText').trim().notEmpty(), validate, reviewController.updateReview);
// router.put('/:id', body('reviewText').trim().notEmpty(), validate, reviewController.updateReview);
// router.delete('/:id', authenticateToken, reviewController.deleteReview);
router.delete('/:id', reviewController.deleteReview);

module.exports = router;
