const multer = require('multer');

// Configure Multer to store the file in memory
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limit file size to 10 MB
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
});

// Middleware to handle file upload
const uploadSingle = (req, h) => {
    return new Promise((resolve, reject) => {
        const singleUpload = upload.single('Img_disease');
        singleUpload(req.raw.req, req.raw.res, (err) => {
            if (err) {
                console.error('Multer Error:', err);
                reject(err);
            } else {
                req.file = req.raw.req.file; // Attach file to the request object
                resolve(h.continue);
            }
        });
    });
};

const uploadSingle1 = (req, h) => {
    return new Promise((resolve, reject) => {
        const singleUpload = upload.single('Img_profile');
        singleUpload(req.raw.req, req.raw.res, (err) => {
            if (err) {
                console.error('Multer Error:', err);
                reject(err);
            } else {
                req.file = req.raw.req.file; // Attach file to the request object
                resolve(h.continue);
            }
        });
    });
};

module.exports = { uploadSingle, uploadSingle1 };
