const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const getReviews = async (req, res) => {
  try {
    const reviews = await prisma.orderReview.findMany({
      include: {
        order: true,
        customer: true,
        restaurant: true,
        deliveryPartner: true
      }
    });
    return successResponse(res, reviews, 'Reviews retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving reviews', 500, error);
  }
};

const getReviewsByCustomerId = async (req, res) => {
  try {
    // URL se ':id' parameter extract kar rahe hain, jise hum customerId maan rahe hain
    const { id: customerId } = req.params; 

    // Validate if customerId is provided
    if (!customerId) {
      // Although route handles this, good for defense-in-depth
      return errorResponse(res, 'Customer ID is required', 400); 
    }

    // Check if the customer actually exists in the database
    const customerExists = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customerExists) {
      return errorResponse(res, 'Customer not found', 404);
    }

    // Prisma ka use karke particular customer ke reviews fetch kar rahe hain
    const customerReviews = await prisma.orderReview.findMany({
      where: {
        customerId: customerId // reviews ko customerId se filter kar rahe hain
      },
      include: {
        order: true,           // Order details include karo
        customer: true,        // Customer details include karo
        restaurant: true,      // Restaurant details include karo
        deliveryPartner: true  // Delivery Partner details include karo (can be null)
      }
    });

    // Agar koi reviews nahi milte hain, toh appropriate message do
    if (customerReviews.length === 0) {
      return successResponse(res, [], 'No reviews found for this customer.', 200);
    }

    return successResponse(res, customerReviews, `Reviews for customer ${customerId} retrieved successfully`);
  } catch (error) {
    console.error('[ReviewController] - Error retrieving reviews by customer ID:', error);
    return errorResponse(res, 'Error retrieving customer reviews', 500, error);
  }
};

const getReviewsByRestaurantId = async (req, res) => {
  try {
    // URL se ':id' parameter extract kar rahe hain, jise hum restaurantId maan rahe hain
    const { id: restaurantId } = req.params; 

    // Validate if restaurantId is provided
    if (!restaurantId) {
      return errorResponse(res, 'Restaurant ID is required', 400); 
    }

    // Check if the restaurant actually exists in the database
    const restaurantExists = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurantExists) {
      return errorResponse(res, 'Restaurant not found', 404);
    }

    // Prisma ka use karke particular restaurant ke reviews fetch kar rahe hain
    // 'restaurantId' field ka use kar rahe hain where clause mein
    const restaurantReviews = await prisma.orderReview.findMany({
      where: {
        restaurantId: restaurantId // reviews ko restaurantId se filter kar rahe hain
      },
      include: {
        order: true,           // Order details include karo
        customer: true,        // Customer details include karo
        restaurant: true,      // Restaurant details include karo
        deliveryPartner: true  // Delivery Partner details include karo (can be null)
      }
    });

    // Agar koi reviews nahi milte hain, toh appropriate message do
    if (restaurantReviews.length === 0) {
      return successResponse(res, [], 'No reviews found for this restaurant.', 200);
    }

    return successResponse(res, restaurantReviews, `Reviews for restaurant ${restaurantId} retrieved successfully`);
  } catch (error) {
    console.error('[ReviewController] - Error retrieving reviews by restaurant ID:', error);
    return errorResponse(res, 'Error retrieving restaurant reviews', 500, error);
  }
};

const createReview = async (req, res) => {
  try {
    const { orderId, reviewText, customerId } = req.body; // <-- customerId now comes from req.body

    // Since customerId is now from req.body, we need to validate its existence
    // and also ensure it's a valid customer in our database.
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });
    if (!customer) {
      return errorResponse(res, 'Customer not found. Please provide a valid customerId.', 404);
    }


    // Check if order exists and belongs to the provided customerId
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: customerId // Use customerId from req.body
      }
    });

    if (!order) {
      return errorResponse(res, 'Order not found or does not belong to the provided customer', 404);
    }

    // Check if a review already exists for this order
    const existingReview = await prisma.orderReview.findFirst({
      where: { orderId: orderId }
    });

    if (existingReview) {
      return errorResponse(res, 'Review already exists for this order', 400);
    }

    // Create the new review
    const review = await prisma.orderReview.create({
      data: {
        reviewText: reviewText,
        orderId: orderId,
        customerId: customerId, // Use customerId from req.body
        restaurantId: order.restaurantId,
        deliveryPartnerId: order.deliveryPartnerId
      },
      include: {
        order: true,
        customer: true,
        restaurant: true,
        deliveryPartner: true
      }
    });

    return successResponse(res, review, 'Review created successfully', 201);
  } catch (error) {
    console.error('[ReviewController] - Error creating review:', error);
    return errorResponse(res, 'Error creating review', 500, error);
  }
};

const updateReview = async (req, res) => {
  try {
    // 1. customerId ko URL parameters se extract karein
    // Tumhari requirement ke anusaar, URL mein ':id' ab customerId hai.
    const { id: customerId } = req.params; 

    // 2. orderId, reviewText, aur stars request body se extract karein.
    // User ne kaha hai ki yeh hamesha payload mein aayenge.
    const { orderId, reviewText, stars } = req.body;

    // Basic validation for required fields
    if (!customerId || !orderId || reviewText === undefined || stars === undefined) {
      return errorResponse(res, 'Missing required fields: customerId in URL, or orderId, reviewText, stars in body.', 400);
    }

    // 3. Pehle us review ko dhoondhe jise update karna hai.
    // Hum review ko customerId (URL se) aur orderId (body se) ke combination se find kar rahe hain.
    // Assuming one review per order per customer.
    const reviewToUpdate = await prisma.orderReview.findFirst({
      where: {
        customerId: customerId, // URL se aaya customerId
        orderId: orderId       // Body se aaya orderId
      }
    });

    if (!reviewToUpdate) {
      // Agar review nahi milta ya yeh customer/order combination ke liye nahi hai.
      return errorResponse(res, 'Review not found for the specified customer and order, or already updated.', 404);
    }

    // 4. Update ke liye data object prepare karein
    const dataToUpdate = {};

    // 'reviewText' ko update karein (string ya null)
    dataToUpdate.reviewText = reviewText; 

    // 'stars' value ko validate aur assign karein
    if (typeof stars === 'number' && stars >= 0.0 && stars <= 5.0) {
      dataToUpdate.stars = parseFloat(stars); 
    } else if (stars === null) {
      dataToUpdate.stars = null; 
    } else {
      // Invalid stars value
      return errorResponse(res, 'Invalid stars value. Must be a number between 0.0 and 5.0, or null.', 400);
    }

    // 5. Review ko update karein, ab jab humein reviewToUpdate.id mil gayi hai
    const updatedReview = await prisma.orderReview.update({
      where: { id: reviewToUpdate.id }, // Found review ka actual review_id use kar rahe hain
      data: dataToUpdate,                // Dynamic data object se update karein
      include: {
        order: true,
        customer: true,
        restaurant: true,
        deliveryPartner: true
      }
    });

    return successResponse(res, updatedReview, 'Review updated successfully', 200); // 200 OK for update
  } catch (error) {
    console.error('[ReviewController] - Error updating review:', error);
    return errorResponse(res, 'Error updating review', 500, error);
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    const existingReview = await prisma.orderReview.findFirst({
      where: {
        id,
        customerId
      }
    });

    if (!existingReview) {
      return errorResponse(res, 'Review not found or does not belong to you', 404);
    }

    await prisma.orderReview.delete({
      where: { id }
    });

    return successResponse(res, null, 'Review deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Error deleting review', 500, error);
  }
};

module.exports = {
  getReviews,
  getReviewsByCustomerId,
  getReviewsByRestaurantId,
  createReview,
  updateReview,
  deleteReview
};
