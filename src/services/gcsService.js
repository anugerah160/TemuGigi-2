const { Storage } = require('@google-cloud/storage');
const path = require('path');

const pathKey = path.resolve('./credentials.json'); // Path to GCP service account key
const bucketName = process.env.CLOUD_STORAGE_BUCKET;

const storage = new Storage({
    projectId: process.env.PROJECT_ID,
    keyFilename: pathKey,
});
const bucket = storage.bucket(bucketName);
/**
 * Upload file to GCS
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Target filename in GCS
 * @returns {Promise<string>} - Public URL of the uploaded file
 */

const uploadToGCS = (buffer, filename) => {
    return new Promise((resolve, reject) => {
        const blob = bucket.file(filename);
        const blobStream = blob.createWriteStream({
            resumable: false,
            contentType: 'image/jpeg',
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });

        blobStream.on('finish', () => {
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
            // console.log('File uploaded to GCS:', publicUrl);
            resolve(publicUrl);
        });

        blobStream.on('error', (err) => {
            console.error('Error uploading to GCS:', err);
            reject(new Error('Failed to upload file to Google Cloud Storage.'));
        });

        // Tulis buffer ke stream dan akhiri
        blobStream.write(buffer);
        blobStream.end();
    });
};

/**
 * Hapus file dari GCS
 * @param {string} filename - Nama file di GCS
 * @returns {Promise<void>}
 */
const deleteFromGCS = (filename) => {
    return new Promise((resolve, reject) => {
        const file = bucket.file(filename);
        file.delete((err) => {
            if (err && err.code !== 404) {
                console.error('Error deleting file from GCS:', err);
                reject(new Error('Failed to delete file from Google Cloud Storage.'));
            } else {
                // console.log('File deleted successfully:', filename);
                resolve();
            }
        });
    });
};

module.exports = { uploadToGCS, deleteFromGCS};
