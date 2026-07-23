const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// @desc    List all admin accounts
// @route   GET /api/admins
// @access  Private (Super Admin)
const getAdmins = asyncHandler(async (req, res) => {
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLogin: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
  res.status(200).json(new ApiResponse(200, admins));
});

// @desc    Create a new admin account (Admin or Accountant)
// @route   POST /api/admins
// @access  Private (Super Admin)
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(422, 'Name, email, and password are required.');
  }
  if (password.length < 8) {
    throw new ApiError(422, 'Password must be at least 8 characters.');
  }
  if (role === 'SUPER_ADMIN') {
    throw new ApiError(403, 'Cannot create another Super Admin from this screen.');
  }

  const existing = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');

  const hashed = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: role === 'ACCOUNTANT' ? 'ACCOUNTANT' : 'ADMIN',
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  res.status(201).json(new ApiResponse(201, admin, 'Admin account created successfully'));
});

// @desc    Activate / deactivate an admin account
// @route   PUT /api/admins/:id/status
// @access  Private (Super Admin)
const setAdminStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const target = await prisma.admin.findUnique({ where: { id: req.params.id } });
  if (!target) throw new ApiError(404, 'Admin not found');
  if (target.role === 'SUPER_ADMIN') {
    throw new ApiError(403, 'Cannot deactivate a Super Admin account.');
  }
  if (target.id === req.admin.id) {
    throw new ApiError(400, 'You cannot change your own account status.');
  }

  const updated = await prisma.admin.update({
    where: { id: req.params.id },
    data: { isActive: Boolean(isActive) },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  res.status(200).json(new ApiResponse(200, updated, 'Admin status updated'));
});

// @desc    Permanently delete an admin account
// @route   DELETE /api/admins/:id
// @access  Private (Super Admin)
const deleteAdmin = asyncHandler(async (req, res) => {
  const target = await prisma.admin.findUnique({ where: { id: req.params.id } });
  if (!target) throw new ApiError(404, 'Admin not found');
  if (target.role === 'SUPER_ADMIN') {
    throw new ApiError(403, 'Cannot delete a Super Admin account.');
  }
  if (target.id === req.admin.id) {
    throw new ApiError(400, 'You cannot delete your own account.');
  }

  await prisma.admin.delete({ where: { id: req.params.id } });

  res.status(200).json(new ApiResponse(200, null, 'Admin account deleted'));
});

module.exports = { getAdmins, createAdmin, setAdminStatus, deleteAdmin };
