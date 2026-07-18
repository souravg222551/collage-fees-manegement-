const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const ApiResponse = require('../utils/ApiResponse');
const { getOrCreateSettings } = require('../utils/idGenerator');
const fs = require('fs');
const path = require('path');

// @desc    Get college / system settings
// @route   GET /api/settings
// @access  Private
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  res.status(200).json(new ApiResponse(200, settings));
});

// @desc    Update college / system settings (optionally with a new logo)
// @route   PUT /api/settings
// @access  Private (Admin)
const updateSettings = asyncHandler(async (req, res) => {
  const existing = await getOrCreateSettings();

  const data = { ...req.body };
  ['receiptNextNumber'].forEach((k) => {
    if (data[k] !== undefined) data[k] = Number(data[k]);
  });

  if (req.file) {
    data.logoUrl = `/uploads/logos/${req.file.filename}`;
    if (existing.logoUrl) {
      const oldPath = path.join(__dirname, '..', '..', existing.logoUrl);
      fs.unlink(oldPath, () => {});
    }
  }

  const settings = await prisma.settings.update({ where: { id: '1' }, data });

  res.status(200).json(new ApiResponse(200, settings, 'Settings updated successfully'));
});

module.exports = { getSettings, updateSettings };
