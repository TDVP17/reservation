const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


/**
 * Upload un buffer ou base64 vers Cloudinary.
 * @param {Buffer|string} file - Buffer multer ou string base64
 * @param {string} folder - Dossier Cloudinary (ex: "shipments")
 * @returns {Promise<string>} URL sécurisée
 */
async function uploadImage(file, folder = "shipments") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    if (Buffer.isBuffer(file)) {
      stream.end(file);
    } else {
      // base64 data URI
      cloudinary.uploader.upload(file, { folder, resource_type: "image" })
        .then(r => resolve(r.secure_url))
        .catch(reject);
    }
  });
}

async function deleteImage(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadImage, deleteImage };
