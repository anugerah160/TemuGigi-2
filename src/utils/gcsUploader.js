const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Konfigurasi Google Cloud Storage
const storage = new Storage({
  projectId: process.env.PROJECT_ID, // ID project Google Cloud Anda
  keyFilename: path.join(__dirname, './credentials.json'), // Path ke file kredensial GCS
});

const bucketName = process.env.BUCKET_NAME; // Nama bucket Anda

/**
 * Upload file ke Google Cloud Storage
 * @param {Buffer} buffer - Buffer dari file yang diunggah
 * @param {string} originalName - Nama file asli
 * @returns {string} URL publik dari file yang diunggah
 */
const uploadFileToGCS = async (buffer, originalName) => {
  const bucket = storage.bucket(bucketName);

  // Buat nama file unik
  const fileName = `img/${Date.now()}-${originalName}`;
  const file = bucket.file(fileName);

  try {
    // Upload file ke GCS
    await file.save(buffer, {
      metadata: {
        contentType: file.mimetype, 
      },
    });

    // Berikan akses publik ke file
    await file.makePublic();

    // URL publik file
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('Error uploading file to GCS:', error);
    throw new Error('Failed to upload file to GCS');
  }
};

module.exports = uploadFileToGCS;
