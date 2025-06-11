const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validation');
const { authenticateToken, tokenBlacklist } = require('../middleware/auth');

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('role').optional().isIn(['customer', 'restaurant', 'delivery_partner']),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const refreshTokenValidation = [
  body('refresh_token').notEmpty()
];

// Routes
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getCurrentUser);

router.post('/send-verification-email',
  body('email').isEmail().normalizeEmail(),
  validate,
  authController.sendVerificationEmail
);

router.post('/verify-otp',
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  validate,
  authController.verifyOtp
);

// Deprecated route for token verification
router.get('/verify-email', authController.verifyEmail);

router.post('/google', 
  body('access_token').notEmpty(), // Your backend will expect the ID Token here
  validate,
  authController.googleSignIn // ✅ Change this to call your actual backend controller!
);

router.post('/refresh-token',
  refreshTokenValidation,
  validate,
  (req, res) => res.status(501).json({ message: 'Refresh token not implemented' })
);

module.exports = router;