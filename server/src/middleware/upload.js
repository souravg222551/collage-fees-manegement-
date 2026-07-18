const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const makeStorage = (subfolder) => {
  const dest = path.join(__dirname, '..', '..', 'uploads', subfolder);
  ensureDir(dest);
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const unique = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${unique}${ext}`);
    },
  });
};

const imageFileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new ApiError(400, 'Only JPG, PNG, or WEBP images are allowed.'));
  }
  cb(null, true);
};

const uploadStudentPhoto = multer({
  storage: makeStorage('students'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

const uploadLogo = multer({
  storage: makeStorage('logos'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = { uploadStudentPhoto, uploadLogo };
