const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Uploads a buffer (from multer memoryStorage) to Cloudinary and returns
// { url, publicId }. Using memory storage + a direct upload_stream means
// nothing ever touches the server's local (ephemeral) disk, so files
// survive restarts/redeploys — unlike local disk storage on platforms
// like Render's free tier.
const uploadBufferToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `college-fee-management/${folder}`, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Non-fatal — old image simply stays orphaned in Cloudinary
  }
};

module.exports = { cloudinary, uploadBufferToCloudinary, deleteFromCloudinary };
