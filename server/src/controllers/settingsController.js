const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const ApiResponse = require('../utils/ApiResponse');
const { getOrCreateSettings } = require('../utils/idGenerator');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get college / school / system settings
// @route   GET /api/settings
// @access  Private
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  res.status(200).json(new ApiResponse(200, settings));
});

// Fields a client is allowed to modify directly (excludes id, logoUrl,
// logoPublicId, updatedAt — those are handled separately/derived).
const EDITABLE_SETTINGS_FIELDS = [
  'institutionType',
  'collegeName',
  'collegeAddress',
  'collegePhone',
  'collegeEmail',
  'currentSession',
  'receiptPrefix',
  'receiptNextNumber',
  'studentIdPrefix',
  'authorizedSignatory',
];

// @desc    Update college / school / system settings (optionally with a new logo)
// @route   PUT /api/settings
// @access  Private (Admin)
const updateSettings = asyncHandler(async (req, res) => {
  const existing = await getOrCreateSettings();

  const data = {};
  EDITABLE_SETTINGS_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  });
  if (data.receiptNextNumber !== undefined) data.receiptNextNumber = Number(data.receiptNextNumber);

  if (req.file) {
    const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'logos');
    data.logoUrl = uploaded.url;
    data.logoPublicId = uploaded.publicId;
    if (existing.logoPublicId) await deleteFromCloudinary(existing.logoPublicId);
  }

  const settings = await prisma.settings.update({ where: { id: '1' }, data });

  res.status(200).json(new ApiResponse(200, settings, 'Settings updated successfully'));
});

module.exports = { getSettings, updateSettings };
