// src/controllers/cuisineController.js

const prisma = require('../config/prisma'); // Prisma client ko import karein
const { successResponse, errorResponse } = require('../utils/responseHandler'); // Response handlers ko import karein

/**
 * @desc Get all cuisines from the database.
 * @route GET /api/cuisines
 * @access Public
 */
const getCuisines = async (req, res) => {
  try {
    // Prisma ka use karke 'Cuisine' model se saari entries fetch karein
    const cuisines = await prisma.cuisine.findMany();

    // Agar koi cuisine nahi milti hai, toh appropriate message de sakte hain
    if (cuisines.length === 0) {
      return successResponse(res, [], 'No cuisines found.', 200);
    }

    // Saari cuisines ko success response ke saath return karein
    return successResponse(res, cuisines, 'Cuisines retrieved successfully');
  } catch (error) {
    // Error hone par console mein log karein aur error response bhejein
    console.error('[CuisineController] - Error retrieving cuisines:', error);
    return errorResponse(res, 'Error retrieving cuisines', 500, error);
  }
};

module.exports = {
  getCuisines,
};