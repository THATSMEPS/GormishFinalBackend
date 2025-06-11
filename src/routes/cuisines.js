// src/routes/cuisines.js

const express = require('express');
const router = express.Router();
const cuisineController = require('../controllers/cuisineController'); // Naye cuisine controller ko import karein

// Route to get all cuisines
// URL: /api/cuisines
router.get('/', cuisineController.getCuisines);

module.exports = router;