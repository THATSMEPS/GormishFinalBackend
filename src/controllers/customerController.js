const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const getCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        area: true
      }
    });
    return successResponse(res, customers, 'Customers retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving customers', 500, error);
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        area: true,
        orders: {
          take: 10,
          orderBy: {
            placedAt: 'desc'
          },
          include: {
            items: {
              include: {
                menuItem: true
              }
            },
            restaurant: true
          }
        }
      }
    });

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    return successResponse(res, customer, 'Customer retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving customer', 500, error);
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, areaId } = req.body;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    // Check if area exists if areaId is provided
    if (areaId) {
      const area = await prisma.areaTable.findUnique({
        where: { id: areaId }
      });

      if (!area) {
        return errorResponse(res, 'Area not found', 404);
      }
    }

    // --- YAHAN PAR PHONE NUMBER UNIQUE CHECK KA LOGIC UPDATE HOGA ---
    // Agar phone number provide kiya gaya hai aur woh existing customer ke phone se alag hai
    if (phone !== undefined && phone !== null && phone !== existingCustomer.phone) {
      // Find First use kar rahe hain kyunki phone ab unique field nahi hai schema mein.
      // Aur 'NOT' condition laga rahe hain taaki current customer ka id exclude ho.
      const phoneExistsForOtherCustomer = await prisma.customer.findFirst({
        where: {
          phone: phone,
          NOT: {
            id: id // Current customer ID ko exclude karo
          }
        }
      });

      if (phoneExistsForOtherCustomer) {
        return errorResponse(res, 'Phone number already in use by another customer', 400);
      }
    }
    // --- PHONE NUMBER LOGIC ENDS HERE ---

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name: name || existingCustomer.name,
        phone: phone || existingCustomer.phone,
        address: address ? JSON.parse(JSON.stringify(address)) : existingCustomer.address,
        areaId: areaId || existingCustomer.areaId
      },
      include: {
        area: true
      }
    });

    return successResponse(res, updatedCustomer, 'Customer updated successfully');
  } catch (error) {
    return errorResponse(res, 'Error updating customer', 500, error);
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    await prisma.customer.delete({
      where: { id }
    });

    return successResponse(res, null, 'Customer deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Error deleting customer', 500, error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
