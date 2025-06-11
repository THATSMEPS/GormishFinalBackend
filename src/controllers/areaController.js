const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const createArea = async (req, res) => {
  try {
    const {
      pincode,
      areaName,
      cityName,
      stateName = 'Gujarat',
      latitude,
      longitude
    } = req.body;

    const existingArea = await prisma.areaTable.findUnique({
      where: { pincode }
    });

    if (existingArea) {
      return errorResponse(res, 'Area with this pincode already exists', 400);
    }

    const area = await prisma.areaTable.create({
      data: {
        pincode,
        areaName,
        cityName,
        stateName,
        latitude,
        longitude
      }
    });

    return successResponse(res, area, 'Area created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Error creating area', 500, error);
  }
};

const getAreas = async (req, res) => {
  try {
    const areas = await prisma.areaTable.findMany();
    return successResponse(res, areas, 'Areas retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving areas', 500, error);
  }
};

const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await prisma.areaTable.findUnique({
      where: { id }
    });

    if (!area) {
      return errorResponse(res, 'Area not found', 404);
    }

    return successResponse(res, area, 'Area retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving area', 500, error);
  }
};

const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pincode,
      areaName,
      cityName,
      stateName,
      latitude,
      longitude
    } = req.body;

    const existingArea = await prisma.areaTable.findUnique({
      where: { id }
    });

    if (!existingArea) {
      return errorResponse(res, 'Area not found', 404);
    }

    const updatedArea = await prisma.areaTable.update({
      where: { id },
      data: {
        pincode,
        areaName,
        cityName,
        stateName,
        latitude,
        longitude
      }
    });

    return successResponse(res, updatedArea, 'Area updated successfully');
  } catch (error) {
    return errorResponse(res, 'Error updating area', 500, error);
  }
};

module.exports = {
  createArea,
  getAreas,
  getAreaById,
  updateArea
};
