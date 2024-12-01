const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const storage = new Storage();
const bucketName = process.env.CLOUD_STORAGE_BUCKET;

const uploadFile = async (filePath, destination) => {
    await storage.bucket(bucketName).upload(filePath, { destination });
    return `https://storage.googleapis.com/${bucketName}/${destination}`;
};

module.exports = { uploadFile };
