const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');

// Files are held in memory only (never written to local disk) and then
// streamed straight to Cloudinary by the controllers. This avoids the
// "photo/logo disappears" bug that happens on hosts with ephemeral
// filesystems (e.g. Render's free tier wipes local disk on every
// restart/redeploy/idle-spindown).
const memoryStorage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new ApiError(400, 'Only JPG, PNG, or WEBP images are allowed.'));
  }
  cb(null, true);
};

const uploadStudentPhoto = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

const uploadLogo = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = { uploadStudentPhoto, uploadLogo };
