const prisma = require('../config/prisma');
const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const createDeliveryPartner = async (req, res) => {
  try {
    const { 
      mobile,
      name,
      gender,
      dateOfBirth,
      vehicleType,
      vehicleRegistrationNo,
      homeAddress,
      password
    } = req.body;

    // Validate phone number is unique
    const existingPartner = await prisma.deliveryPartner.findUnique({
      where: { mobile }
    });

    if (existingPartner) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Create delivery partner
    const deliveryPartner = await prisma.deliveryPartner.create({
      data: {
        mobile,
        name,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        vehicleType,
        vehicleRegistrationNo,
        homeAddress,
        isLive: true,
        status: 'not_approved',
        password: await bcrypt.hash(password, 10),
      }
    });

    // JWT token expiration time set kiya 1 week
    const expiresInSeconds = 7 * 24 * 60 * 60; // 1 week in seconds
    const expirationTimestampMs = Date.now() + (expiresInSeconds * 1000); // Current timestamp + 1 week in milliseconds

    // JWT token generate kiya naye partner ke liye
    // Make sure 'jwt' and 'config.jwtSecret' are defined and available in this scope.
    const authToken = jwt.sign(
      { id: deliveryPartner.id, mobile: deliveryPartner.mobile },
      config.jwtSecret, // Assuming 'config.jwtSecret' is globally available or imported
      { expiresIn: expiresInSeconds } // JWT expiration set kiya 1 week
    );

    // Password ko response se hata diya security ke liye
    const { password: hashedPassword, ...partnerData } = deliveryPartner; 
    
    // FIX: Naye partner ka data, authToken aur expiresIn (timestamp) ko JSON response mein add kiya hai
    res.status(201).json({ 
      message: 'Delivery partner created successfully', 
      partner: partnerData, // Naye partner ka data (password ke bina)
      authToken: authToken, 
      expiresIn: expirationTimestampMs // Frontend ke validation ke liye expiration timestamp (milliseconds mein)
    });

    // res.status(201).json(deliveryPartner);
  } catch (error) {
    console.error('Create delivery partner error:', error);
    res.status(500).json({ error: 'Error creating delivery partner' });
  }
};

const loginDeliveryPartner = async (req, res) => {
  try {
    const { mobile, password } = req.body; // Frontend se mobile aur password liya

    // Sabse pehle mobile number se partner ko dhoonda
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { mobile }
    });

    // Agar partner mila hi nahi toh error!
    if (!deliveryPartner) {
      return res.status(401).json({ error: 'Invalid mobile number or password' });
    }

    // Ab password compare kiya, hashed password se
    const isPasswordValid = await bcrypt.compare(password, deliveryPartner.password);

    // Agar password match nahi hua toh bhi error!
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid mobile number or password' });
    }

    // Sab sahi hai toh partner details bhej di (password exclude karke, security first! 😉)
    // Tu chahe toh yahan JWT token bhi generate karke bhej sakta hai for authentication.
    const { password: hashedPassword, ...partnerData } = deliveryPartner; // password hata diya response se

    // Generate JWT token without expiration
    const expiresInSeconds = 7 * 24 * 60 * 60; // 1 week in seconds
    const expirationTimestampMs = Date.now() + (expiresInSeconds * 1000);

    const authToken = jwt.sign(
      { id: partnerData.id, mobile: partnerData.mobile },
      config.jwtSecret,
      {expiresIn: expiresInSeconds}
    );
    
    res.status(200).json({ message: 'Login successful', partner: partnerData, authToken: authToken, expiresIn: expirationTimestampMs });

  } catch (error) {
    // Kuch gadbad hui toh error log kiya aur 500 status code ke saath generic error message bhej diya
    console.error('Delivery partner login error:', error);
    res.status(500).json({ error: 'Error logging in delivery partner' });
  }
};

const updateDeliveryPartnerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(status).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const deliveryPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: { status }
    });

    res.json(deliveryPartner);
  } catch (error) {
    console.error('Update delivery partner status error:', error);
    res.status(500).json({ error: 'Error updating delivery partner status' });
  }
};

const updateDeliveryPartnerIsLive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isLive } = req.body;

    if (typeof isLive !== 'boolean') {
      return res.status(400).json({ error: 'Invalid isLive value. It must be true or false.' });
    }

    const deliveryPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: { isLive }
    });

    res.json(deliveryPartner);
  } catch (error) {
    console.error('Update delivery partner status error:', error);
    res.status(500).json({ error: 'Error updating delivery partner status' });
  }
};

const updateLiveLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, isLive } = req.body;

    const liveLocation = latitude && longitude ? { latitude, longitude } : null;

    const deliveryPartner = await prisma.deliveryPartner.update({
      where: { id },
      data: {
        isLive: isLive ?? true,
        liveLocation
      }
    });

    // Emit real-time location update
    if (liveLocation) {
      const { error: supabaseError } = await supabase
        .from('delivery_partner_locations')
        .upsert({
          dp_id: id,
          location: liveLocation,
          updated_at: new Date().toISOString()
        });

      if (supabaseError) {
        console.error('Supabase real-time event error:', supabaseError);
      }
    }

    res.json(deliveryPartner);
  } catch (error) {
    console.error('Update live location error:', error);
    res.status(500).json({ error: 'Error updating live location' });
  }
};

const getDeliveryPartners = async (req, res) => {
  try {
    const { status, isLive } = req.query;

    let where = {};
    if (status) {
      where.status = status;
    }
    if (isLive !== undefined) {
      where.isLive = isLive === 'true';
    }

    const deliveryPartners = await prisma.deliveryPartner.findMany({
      where,
      select: {
        id: true,
        name: true,
        mobile: true,
        status: true,
        isLive: true,
        liveLocation: true,
        vehicleType: true,
        _count: {
          select: {
            orders: {
              where: {
                status: {
                  in: ['dispatch', 'delivered']
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(deliveryPartners);
  } catch (error) {
    console.error('Get delivery partners error:', error);
    res.status(500).json({ error: 'Error fetching delivery partners' });
  }
};

const getDeliveryPartnerById = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: {
            placedAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!deliveryPartner) {
      return res.status(404).json({ error: 'Delivery partner not found' });
    }

    res.json(deliveryPartner);
  } catch (error) {
    console.error('Get delivery partner error:', error);
    res.status(500).json({ error: 'Error fetching delivery partner' });
  }
};

const acceptOrder = async (req, res) => {
  try {
    // All three pieces of data are now expected in the request body
    const { dpId, orderId, dpAcceptedAt } = req.body; 

    console.log(`Received request for DP ${dpId} to accept order ${orderId} at: ${dpAcceptedAt}`);

    // --- Input Validation ---
    if (!dpId) {
      console.log('Error: Delivery Partner ID (dpId) is missing in request body.');
      // Make sure errorResponse function is accessible (imported or global)
      return errorResponse(res, 'Delivery Partner ID is required in request body', 400);
    }
    if (!orderId) {
      console.log('Error: Order ID is missing in request body.');
      return errorResponse(res, 'Order ID is required in request body', 400);
    }
    if (!dpAcceptedAt) {
      console.log('Error: Acceptance timestamp (dpAcceptedAt) is missing in request body.');
      return errorResponse(res, 'Acceptance timestamp (dpAcceptedAt) is required in request body', 400);
    }

    // 1. Verify if Delivery Partner exists
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: dpId } 
    });

    if (!deliveryPartner) {
      console.log(`Delivery Partner with ID ${dpId} not found.`);
      return errorResponse(res, 'Delivery Partner not found', 404);
    }

    // 2. Verify if Order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.log(`Order with ID ${orderId} not found.`);
      return errorResponse(res, 'Order not found', 404);
    }

    // 3. Update the order with delivery partner details and change status to 'picked_up'
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryPartnerId: dpId, // Delivery partner ID assign kiya
        dpAcceptedAt: dpAcceptedAt, // Frontend se aaya hua current timestamp
        // status: 'picked_up' // Order status ko 'picked_up' par set kiya
      }
    });

    console.log(`Order ${orderId} successfully accepted by DP ${dpId}. Status updated to: ${updatedOrder.status}`);

    // Fetch the full updated order to emit a socket.io event
    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        customer: true,
        deliveryPartner: true // Delivery partner details include kiya
      }
    });

    const io = req.app.get('io');
    io.emit('order:update', fullOrder); // Real-time event emit kiya

    return successResponse(res, updatedOrder, 'Order accepted by delivery partner successfully');
  } catch (error) {
    console.error('Error accepting order by delivery partner:', error);
    return errorResponse(res, 'Error accepting order by delivery partner', 500, error);
  }
};

const completeOrder = async (req, res) => {
  try {
    const { dpId, orderId, dpDeliveredAt, status } = req.body;

    console.log(`Received request to complete order ${orderId} by DP ${dpId} at: ${dpDeliveredAt}`);

    // --- Input Validation ---
    if (!dpId || !orderId || !dpDeliveredAt || status !== 'delivered') {
      console.log('Error: Missing or invalid required fields for completing order.');
      return errorResponse(res, 'Missing or invalid required fields (dpId, orderId, dpDeliveredAt, status: "delivered")', 400);
    }

    // 1. Verify if Delivery Partner exists
    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: dpId }
    });

    if (!deliveryPartner) {
      console.log(`Delivery Partner with ID ${dpId} not found.`);
      return errorResponse(res, 'Delivery Partner not found', 404);
    }

    // 2. Verify if Order exists and is assigned to this DP
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.log(`Order with ID ${orderId} not found.`);
      return errorResponse(res, 'Order not found', 404);
    }

    // Optional: Add a check if the order is actually assigned to this dpId
    if (order.deliveryPartnerId !== dpId) {
        console.log(`Order ${orderId} is not assigned to Delivery Partner ${dpId}.`);
        return errorResponse(res, 'Order not assigned to this Delivery Partner', 403);
    }

    // 3. Update the order status to 'delivered' and set dpDeliveredAt
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'delivered', // Set status to 'delivered'
        dpDeliveredAt: dpDeliveredAt, // Record delivery timestamp
      }
    });

    console.log(`Order ${orderId} successfully completed by DP ${dpId}. Final Status: ${updatedOrder.status}`);

    // Emit socket.io event for real-time updates
    const io = req.app.get('io'); // Assuming socket.io is set up on req.app
    io.emit('order:update', updatedOrder); 

    return successResponse(res, updatedOrder, 'Order completed successfully');
  } catch (error) {
    console.error('Error completing order:', error);
    return errorResponse(res, 'Error completing order', 500, error);
  }
};

const getDeliveryPartnerOrders = async (req, res) => {
  try {
    const { dpId } = req.params; 

    console.log(`Received GET request to fetch orders for Delivery Partner ID: ${dpId}`);

    if (!dpId) {
      console.log('Error: Missing dpId in request parameters for fetching orders.');
      return errorResponse(res, 'Missing Delivery Partner ID', 400);
    }

    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { id: dpId }
    });

    if (!deliveryPartner) {
      console.log(`Delivery Partner with ID ${dpId} not found.`);
      return errorResponse(res, 'Delivery Partner not found', 404);
    }

    const orders = await prisma.order.findMany({
      where: {
        deliveryPartnerId: dpId 
      },
    });

    console.log(`Fetched ${orders.length} orders for DP ID ${dpId}.`);

    return successResponse(res, orders, 'Orders fetched successfully for Delivery Partner');

  } catch (error) {
    console.error('Error fetching delivery partner orders:', error);
    return errorResponse(res, 'Error fetching delivery partner orders', 500, error);
  }
};

module.exports = {
  createDeliveryPartner,
  updateDeliveryPartnerStatus,
  updateLiveLocation,
  getDeliveryPartners,
  getDeliveryPartnerById,
  loginDeliveryPartner,
  acceptOrder,
  completeOrder,
  updateDeliveryPartnerIsLive,
  getDeliveryPartnerOrders
};
