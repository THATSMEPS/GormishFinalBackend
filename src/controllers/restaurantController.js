const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const supabase = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const config = require('../config/environment');
const fetch = require('node-fetch');  // Add node-fetch for server-side HTTP requests

// Multer setup for handling multipart/form-data with multiple files
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const reverseGeocode = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return errorResponse(res, 'Latitude and longitude query parameters are required', 400);
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GormishBackend/1.0 (lekorof656@3dboxer.com)' // Replace with your contact info
      }
    });

    if (!response.ok) {
      return errorResponse(res, `Error from reverse geocoding service: ${response.statusText}`, response.status);
    }

    const data = await response.json();
    return successResponse(res, data, 'Reverse geocoding successful');
  } catch (error) {
    return errorResponse(res, 'Error while reverse geocoding coordinates', 500, error);
  }
};

const updateRestaurantOpenStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isOpen } = req.body;

    if (typeof isOpen !== 'boolean') {
      return errorResponse(res, 'Invalid isOpen value', 400);
    }

    // Ensure the authenticated user owns the restaurant
    if (id !== req.user.id) {
      return errorResponse(res, 'Unauthorized to update this restaurant', 403);
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: { isOpen }
    });

    return successResponse(res, updatedRestaurant, 'Restaurant open status updated successfully');
  } catch (error) {
    return errorResponse(res, 'Error updating restaurant open status', 500, error);
  }
};

const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        area: true
      }
    });
    return successResponse(res, restaurants, 'Restaurants retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving restaurants', 500, error);
  }
};

const getRestaurantsByArea = async (req, res) => {
  try {
    const { areaId } = req.params;
    const restaurants = await prisma.restaurant.findMany({
      where: { areaId },
      include: {
        area: true
      }
    });
    return successResponse(res, restaurants, 'Area restaurants retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving area restaurants', 500, error);
  }
};

const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        area: true
      }
    });

    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    // Explicitly include banners in the response
    const responseRestaurant = {
      ...restaurant,
      banners: restaurant.banners
    };

    return successResponse(res, responseRestaurant, 'Restaurant retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving restaurant', 500, error);
  }
};

const createRestaurant = async (req, res) => {
  try {
    // Extract fields from req.body
    const {
      name,
      mobile,
      email,
      password,
      cuisines,
      vegNonveg,
      hours,
      serving_radius,
      areaId,
      address,
      applicableTaxBracket
    } = req.body;

    // Check if restaurant already exists
    const existingRestaurant = await prisma.restaurant.findFirst({
      where: {
        OR: [{ email }, { mobile }]
      }
    });
    if (existingRestaurant) {
      return errorResponse(res, 'Restaurant with this email or mobile already exists', 400);
    }

    // Validate areaId
    const area = await prisma.areaTable.findUnique({
      where: { id: areaId }
    });

    if (!area) {
      return errorResponse(res, 'Invalid area ID', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle banner image uploads if files are present
    let banners = [];
    if (req.files && req.files.length > 0) {
      const folderName = `${Date.now()}`; // or use user ID if available
      for (const file of req.files) {
        const fileName = `${folderName}/${Date.now()}-${file.originalname}`;
        const { data, error } = await supabase.storage
          .from('banners')
          .upload(fileName, file.buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.mimetype
          });
        if (error) {
          console.error('Supabase upload error:', error);
          return errorResponse(res, 'Error uploading banner image', 500, error);
        }
        const { data: { publicUrl } } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName);
        banners.push(publicUrl);
      }
    }

    // Create restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        mobile,
        email,
        password: hashedPassword,
        cuisines,
        vegNonveg,
        hours: hours ? JSON.parse(JSON.stringify(hours)) : {},
        address: address ? JSON.parse(JSON.stringify(address)) : {},
        banners,
        applicableTaxBracket: applicableTaxBracket ? parseFloat(applicableTaxBracket) : null,
        areaId,
        serving_radius: serving_radius ? parseInt(serving_radius) : 0
      }
    });

    // Generate JWT token without expiration
    const token = jwt.sign(
      { id: restaurant.id, email: restaurant.email },
      config.jwtSecret
    );

    return successResponse(res, { restaurant, token }, 'Restaurant created successfully', 201);
  } catch (error) {
    console.error('Restaurant creation error:', error);
    return errorResponse(res, `Error creating restaurant: ${error.message}`, 500, error);
  }
};

const loginRestaurant = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find restaurant
    const restaurant = await prisma.restaurant.findUnique({
      where: { email }
    });

    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, restaurant.password);
    if (!isValidPassword) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Generate JWT token without expiration
    const token = jwt.sign(
      { id: restaurant.id, email: restaurant.email },
      config.jwtSecret
    );

    return successResponse(res, {
      restaurant: {
        id: restaurant.id,
        email: restaurant.email,
        name: restaurant.name
      },
      token
    }, 'Login successful');
  } catch (error) {
    console.error('Restaurant login error:', error);
    return errorResponse(res, 'Error during login', 500, error);
  }
};

const logoutRestaurant = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const { tokenBlacklist } = require('../middleware/auth');
      tokenBlacklist.add(token);
    }
    return successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    return errorResponse(res, 'Error during logout', 500, error);
  }
};

const getCurrentRestaurant = async (req, res) => {
  try {
    console.log('req.user.id:', req.user.id);  // Added logging for debugging

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.user.id },
      include: { area: true }
    });

    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    // Explicitly include serving_radius, hours, isOpen, and banners in the response
    const responseRestaurant = {
      ...restaurant,
      serving_radius: restaurant.serving_radius,
      hours: restaurant.hours,
      isOpen: restaurant.isOpen,
      banners: restaurant.banners
    };

    return successResponse(res, responseRestaurant, 'Restaurant retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving restaurant', 500, error);
  }
};

const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      mobile,
      email,
      cuisines,
      vegNonveg,
      hours,
      address,
      banners,
      applicableTaxBracket
    } = req.body;

    // Ensure the authenticated user owns the restaurant
    if (id !== req.user.id) {
      return errorResponse(res, 'Unauthorized to update this restaurant', 403);
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    // Check for unique email and mobile if they are being updated
    if ((email && email !== restaurant.email) || (mobile && mobile !== restaurant.mobile)) {
      const existingRestaurant = await prisma.restaurant.findFirst({
        where: {
          OR: [{ email: email || restaurant.email }, { mobile: mobile || restaurant.mobile }],
          NOT: { id }
        }
      });

      if (existingRestaurant) {
        return errorResponse(res, 'Email or mobile already in use', 400);
      }
    }

    // Preserve open/close times in hours JSON without removing them
    let updatedHours = restaurant.hours;
    if (hours) {
      updatedHours = JSON.parse(JSON.stringify(hours));
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        name: name || restaurant.name,
        mobile: mobile || restaurant.mobile,
        email: email || restaurant.email,
        cuisines: cuisines || restaurant.cuisines,
        vegNonveg: vegNonveg || restaurant.vegNonveg,
        hours: updatedHours,
        address: address ? JSON.parse(JSON.stringify(address)) : restaurant.address,
        banners: banners || restaurant.banners,
        applicableTaxBracket: applicableTaxBracket ? parseFloat(applicableTaxBracket) : restaurant.applicableTaxBracket
      }
    });

    return successResponse(res, updatedRestaurant, 'Restaurant updated successfully');
  } catch (error) {
    return errorResponse(res, 'Error updating restaurant', 500, error);
  }
};

const updateApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval } = req.body;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: { approval }
    });

    return successResponse(res, updatedRestaurant, 'Restaurant approval status updated');
  } catch (error) {
    return errorResponse(res, 'Error updating restaurant approval', 500, error);
  }
};

const deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure the authenticated user owns the restaurant
    if (id !== req.user.id) {
      return errorResponse(res, 'Unauthorized to delete this restaurant', 403);
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    await prisma.restaurant.delete({
      where: { id }
    });

    return successResponse(res, null, 'Restaurant deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Error deleting restaurant', 500, error);
  }
};

const uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    const restaurantId = req.user.id;
    const file = req.file;
    const folderName = `${restaurantId}`;
    const fileName = `${folderName}/${Date.now()}-${file.originalname}`;

    // Upload file buffer to Supabase bucket 'banners'
    const { data, error } = await supabase.storage
      .from('banners')
      .upload(fileName, file.buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.mimetype
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return errorResponse(res, 'Error uploading banner image', 500, error);
    }

    // Get public URL of uploaded banner
    const { data: { publicUrl } } = supabase.storage
      .from('banners')
      .getPublicUrl(fileName);

    // Fetch current restaurant banners
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    // Replace old banners with new banner URL
    const updatedBanners = [publicUrl];

    // Update restaurant banners in database
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { banners: updatedBanners }
    });

    return successResponse(res, updatedRestaurant, 'Banner updated successfully');
  } catch (error) {
    console.error('Error in uploadBanner:', error);
    return errorResponse(res, 'Error updating banner', 500, error);
  }
};
// New uploadBanner method to handle banner image upload and update
const uploadBannerSignup = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    const restaurantId = req.user.id;
    const file = req.file;
    const folderName = `banners`;
    const fileName = `${folderName}/${Date.now()}-${file.originalname}`;

    // Upload file buffer to Supabase bucket 'banners'
    const { data, error } = await supabase.storage
      .from('banners')
      .upload(fileName, file.buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.mimetype
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return errorResponse(res, `Error uploading banner image: ${error.message || JSON.stringify(error)}`, 500);
    }

    // Get public URL of uploaded banner
    const { data: { publicUrl } } = supabase.storage
      .from('banners')
      .getPublicUrl(fileName);

    // Update restaurant banners in database
    const updatedBanners = [publicUrl];
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { banners: updatedBanners }
    });

    // Return the updated restaurant data
    return successResponse(res, updatedRestaurant, 'Banner uploaded and saved successfully');
  } catch (error) {
    console.error('Error in uploadBannerSignup:', error);
    return errorResponse(res, `Error uploading banner: ${error.message || error}`, 500);
  }
};
module.exports = {
  getAllRestaurants,
  getRestaurantsByArea,
  getRestaurantById,
  createRestaurant,
  loginRestaurant,
  logoutRestaurant,
  getCurrentRestaurant,
  updateRestaurant,
  updateApprovalStatus,
  deleteRestaurant,
  uploadBanner,
  upload,
  updateRestaurantOpenStatus,
  uploadBannerSignup,
  reverseGeocode
};
