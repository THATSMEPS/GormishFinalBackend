const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validation');
const multer = require('multer');
const upload = multer();

// Validation middleware
const restaurantValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('mobile').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit mobile number is required'),
  body('cuisines').isString().notEmpty().withMessage('Cuisines are required'),
  body('vegNonveg').isIn(['veg', 'nonveg', 'both']).withMessage('Valid food type is required'),
  body('areaId').notEmpty().withMessage('Area ID is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('hours').notEmpty().withMessage('Operating hours are required')
];
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Routes
router.get('/reverse-geocode', restaurantController.reverseGeocode);
router.get('/', restaurantController.getAllRestaurants);
router.get('/area/:areaId', restaurantController.getRestaurantsByArea);
router.get('/me', authenticateToken, restaurantController.getCurrentRestaurant);
router.get('/:id', restaurantController.getRestaurantById);
router.post('/', restaurantValidation, validate, restaurantController.createRestaurant);
router.post('/login', loginValidation, validate, restaurantController.loginRestaurant);
router.post('/logout', authenticateToken, restaurantController.logoutRestaurant);
router.patch('/:id', authenticateToken, restaurantValidation, validate, restaurantController.updateRestaurant);
router.patch('/:id/approval', authenticateToken, body('approval').isBoolean(), validate, restaurantController.updateApprovalStatus);
router.delete('/:id', authenticateToken, restaurantController.deleteRestaurant);
router.put('/:id/openstatus', authenticateToken, restaurantController.updateRestaurantOpenStatus);
// router.patch('/:id/banner', authenticateToken, upload.single('file'), restaurantController.uploadBanner);
router.patch('/:id/banner', authenticateToken, upload.single('file'), restaurantController.uploadBanner);
router.post('/signup/banner', authenticateToken, upload.single('file'), restaurantController.uploadBannerSignup);
module.exports = router;
