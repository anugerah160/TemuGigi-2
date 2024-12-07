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

const copyFileInGCS = (sourcePath, destinationPath) => {
    return new Promise((resolve, reject) => {
        const sourceFile = bucket.file(sourcePath);
        const destinationFile = bucket.file(destinationPath);

        sourceFile.copy(destinationFile, (err, copiedFile) => {
            if (err) {
                console.error('Error copying file in GCS:', err);
                reject(new Error('Failed to copy file in Google Cloud Storage.'));
            } else {
                const publicUrl = `https://storage.googleapis.com/${bucketName}/${destinationPath}`;
                resolve(publicUrl);
            }
        });
    });
};

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
            resolve(publicUrl);
        });

        blobStream.on('error', (err) => {
            console.error('Error uploading to GCS:', err);
            reject(new Error('Failed to upload file to Google Cloud Storage.'));
        });

        blobStream.write(buffer);
        blobStream.end();
    });
};

/**
 * Delete file from GCS
 * @param {string} filename - File name in GCS
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
                resolve();
            }
        });
    });
};

module.exports = { uploadToGCS, deleteFromGCS, copyFileInGCS };
