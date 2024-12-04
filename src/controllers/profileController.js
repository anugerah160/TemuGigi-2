const { uploadToGCS, deleteFromGCS } = require('../services/gcsService');
const pool = require('../utils/database');
const crypto = require('crypto');

const getProfile = async (request, h) => {
    const userId = request.auth.credentials.id;

    const query = `SELECT * FROM Users WHERE Id = ?`;
    const [rows] = await pool.query(query, [userId]);

    if (rows.length === 0) {
        return h.response({ message: 'User not found' }).code(404);
    }

    return h.response(rows[0]).code(200);
};

const updateProfile = async (request, h) => {
    const userId = request.auth.credentials.id;
    let payload = request.payload;
  
    try {
      // Daftar kolom yang diizinkan untuk di-update
      const allowedFields = ["Name", "Email", "Gender", "Birth_date", "Phone", "Ktp", "Nim", "Appointment_Place", "University"];
  
      // Filter hanya kolom yang diizinkan
      const filteredPayload = Object.keys(payload)
        .filter((key) => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = payload[key];
          return obj;
        }, {});
  
      // Validasi dan format tanggal (Birth_date)
      if (filteredPayload.Birth_date) {
        const date = new Date(filteredPayload.Birth_date);
        if (isNaN(date.getTime())) {
          throw new Error("Invalid date format");
        }
        filteredPayload.Birth_date = date.toISOString().split("T")[0]; // Format YYYY-MM-DD
      }
  
      const query = `UPDATE Users SET ? WHERE Id = ?`;
      await pool.query(query, [filteredPayload, userId]);
  
      return h.response({ message: "Profile updated successfully" }).code(200);
    } catch (error) {
      console.error("Update Profile Error:", error.message || error);
      return h.response({ message: "Internal Server Error" }).code(500);
    }
};

const updatePicture = async (request, h) => {
  const userId = request.auth.credentials.id; // Ambil ID pengguna dari JWT

  try {
    if (!request.file) {
      return h.response({ message: "No file uploaded" }).code(400);
    }
    const randomString = crypto.randomBytes(2).toString('hex');
    const newFileName = `profile-img/${randomString}-${userId}.jpg`; // Nama file baru
    const newImageUrl = await uploadToGCS(request.file.buffer, newFileName); // Upload ke GCS

    // Ambil data Img_profile pengguna sebelumnya
    const [userData] = await pool.query('SELECT Img_profile FROM Users WHERE Id = ?', [userId]);
    if (userData.length > 0 && userData[0].Img_profile) {
      const oldFileName = userData[0].Img_profile.split('/').slice(-2).join('/'); // Path file lama
      if (oldFileName !== newFileName) {
        await deleteFromGCS(oldFileName); // Hapus file lama
      }
    }

    // Update Img_profile di database
    await pool.query('UPDATE Users SET Img_profile = ? WHERE Id = ?', [newImageUrl, userId]);

    return h.response({ message: "Profile picture updated successfully" }).code(200);
  } catch (error) {
    console.error("Update Picture Error:", error.message || error);
    return h.response({ message: "Internal Server Error", error: error.message }).code(500);
  }
};


  
module.exports = { getProfile, updateProfile, updatePicture };
