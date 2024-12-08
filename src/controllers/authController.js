const pool = require('../utils/database');
const bcrypt = require('bcrypt');
const jwtService = require('../services/jwtService');
const nodemailer = require('nodemailer');

const generateUniqueID = async (prefix) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // Get nilai numerik terbesar di database
    const [rows] = await pool.query(`
        SELECT MAX(CAST(SUBSTRING(Id, 10) AS UNSIGNED)) AS lastNumber 
        FROM Users WHERE Id LIKE ?`, [`${prefix}%`]);
    const lastNumber = rows[0]?.lastNumber || 0;

    return `${prefix}${year}${month}${day}${String(lastNumber + 1).padStart(4, '0')}`;
};

const registerPatient = async (request, h) => {
    const { email, password, name, gender, birth_date, city, phone } = request.payload;

    // Periksa apakah email sudah terdaftar
    const emailCheckQuery = `SELECT COUNT(*) AS count FROM Users WHERE Email = ?`;
    const [emailCheckResult] = await pool.query(emailCheckQuery, [email]);

    if (emailCheckResult[0].count > 0) {
        return h.response({ message: 'Email telah terdaftar' }).code(400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate ID unik untuk Patient
    const patientID = await generateUniqueID('P');

    const query = `
        INSERT INTO Users (Id, Email, Password, Name, Role, Gender, Birth_date, City, Phone)
        VALUES (?, ?, ?, ?, 'Patient', ?, ?, ?, ?)`;

    await pool.query(query, [patientID, email, hashedPassword, name, gender, birth_date, city, phone]);
    return h.response({ message: 'Patient registered successfully', id: patientID }).code(201);
};

const registerCoass = async (request, h) => {
    const { email, password, name, gender, birth_date, ktp, nim, appointment_place, university, phone } = request.payload;

    // Periksa apakah email, KTP, atau NIM sudah terdaftar
    const checkQuery = `
        SELECT COUNT(*) AS count 
        FROM Users 
        WHERE Email = ? OR Ktp = ? OR Nim = ?`;
    const [checkResult] = await pool.query(checkQuery, [email, ktp, nim]);

    if (checkResult[0].count > 0) {
        return h.response({ message: 'Email, KTP, atau NIM telah terdaftar' }).code(400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate ID unik untuk Coass
    const coassID = await generateUniqueID('C');

    const query = `
        INSERT INTO Users (Id, Email, Password, Name, Role, Gender, Birth_date, Ktp, Nim, Appointment_Place, University, Phone)
        VALUES (?, ?, ?, ?, 'Coass', ?, ?, ?, ?, ?, ?, ?)`;

    await pool.query(query, [coassID, email, hashedPassword, name, gender, birth_date, ktp, nim, appointment_place, university, phone]);
    return h.response({ message: 'Co-Ass registered successfully', id: coassID }).code(201);
};


const login = async (request, h) => {
    try {
        const { email, password } = request.payload;

        // Query user from the database
        const query = `SELECT * FROM Users WHERE Email = ?`;
        const [rows] = await pool.query(query, [email]);

        if (rows.length === 0) {
            return h.response({ message: 'User not found' }).code(404);
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.Password);

        if (!isPasswordValid) {
            return h.response({ message: 'Invalid credentials' }).code(401);
        }

        // Generate JWT token
        const token = jwtService.generateToken({ id: user.Id, role: user.Role });
        return h.response({ token, role: user.Role }).code(200);
    } catch (error) {
        console.error('POST /login Error:', error.message);
        return h.response({ message: 'Internal Server Error' }).code(500);
    }
};

const forgotPassword = async (request, h) => {
    const { email } = request.payload;

    try {
        const query = `SELECT * FROM Users WHERE Email = ?`;
        const [rows] = await pool.query(query, [email]);

        if (rows.length === 0) {
            return h.response({ message: 'If the email exists, a reset link has been sent' }).code(200);
        }

        // Generate reset token with expiration
        const resetToken = jwtService.generateToken({ email }, '12h');
        const resetUrl = `https://dental-app-service-302773936528.asia-southeast2.run.app/reset-password?token=${resetToken}`;

        // Send email
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Atur service atau SMTP server
            auth: {
                user: process.env.EMAIL_USER,// Email tumbal
                pass: process.env.EMAIL_PASS,// Password
            },
        });

        const mailOptions = {
            from: '"Temu Gigi" Assistan Minko',
            to: email,
            subject: 'Password Reset Request',
            text: `Klik link dibawah ini untuk reset password, Hanya berlaku 1jam:\n\n${resetUrl}`,
            html: `<p>Klik link dibawah ini untuk reset password, Hanya berlaku 1jam:</p><a href="${resetUrl}">${resetUrl}</a>`,
        };

        await transporter.sendMail(mailOptions);

        return h.response({ message: 'If the email exists, a reset link has been sent' }).code(200);
    } catch (error) {
        console.error(error);
        return h.response({ message: 'Internal server error' }).code(500);
    }
};

const resetPassword = async (request, h) => {
    const { token, newPassword } = request.payload;
    try {
        // Verifikasi token
        const decoded = jwtService.verifyToken(token);

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password in database
        const query = `UPDATE Users SET Password = ? WHERE Email = ?`;
        const [result] = await pool.query(query, [hashedPassword, decoded.email]);

        if (result.affectedRows === 0) {
            return h.response({ message: 'User not found' }).code(404);
        }

        return h.response({ message: 'Password reset successfully' }).code(200);
    } catch (error) {
        console.error(error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return h.response({ message: 'Invalid or expired token' }).code(400);
        }

        return h.response({ message: 'Internal server error' }).code(500);
    }
};


const changePassword = async (request, h) => {
    const { oldPassword, newPassword } = request.payload;
    const userId = request.auth.credentials.id;

    const query = `SELECT * FROM Users WHERE Id = ?`;
    const [rows] = await pool.query(query, [userId]);

    if (rows.length === 0) {
        return h.response({ message: 'User not found' }).code(404);
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(oldPassword, user.Password);

    if (!isPasswordValid) {
        return h.response({ message: 'Old password is incorrect' }).code(401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE Users SET Password = ? WHERE Id = ?`, [hashedPassword, userId]);

    return h.response({ message: 'Password updated successfully' }).code(200);
};

module.exports = { registerPatient, registerCoass, login, forgotPassword, resetPassword, changePassword };
