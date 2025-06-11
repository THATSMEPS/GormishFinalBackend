const prisma = require('../config/prisma');
const supabase = require('../config/supabase');

const createDeliveryPartner = async (req, res) => {
  try {
    const { 
      mobile,
      name,
      gender,
      dateOfBirth,
      vehicleType,
      vehicleRegistrationNo,
      homeAddress
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
        isLive: false,
        status: 'not_approved'
      }
    });

    res.status(201).json(deliveryPartner);
  } catch (error) {
    console.error('Create delivery partner error:', error);
    res.status(500).json({ error: 'Error creating delivery partner' });
  }
};

const updateDeliveryPartnerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(DpStatus).includes(status)) {
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

module.exports = {
  createDeliveryPartner,
  updateDeliveryPartnerStatus,
  updateLiveLocation,
  getDeliveryPartners,
  getDeliveryPartnerById
};
