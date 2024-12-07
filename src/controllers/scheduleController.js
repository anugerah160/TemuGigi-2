const pool = require('../utils/database');

const verifyRole = (role) => {
    return (request, h) => {
        if (request.auth.credentials.role !== role) {
            return h.response({ message: 'Forbidden' }).code(403).takeover();
        }
        return h.continue;
    };
};

const scheduleMeeting = async (request, h) => {
    const { request_id, appointment_date, appointment_place } = request.payload;
    const coass_id = request.auth.credentials.id;

    // Validasi apakah request diterima
    const [requestData] = await pool.query(
        `SELECT * FROM Requests WHERE Request_id = ? AND Coass_id = ? AND Status = 'Accepted'`,
        [request_id, coass_id]
    );

    if (requestData.length === 0) {
        return h.response({ message: 'Invalid request or not accepted yet.' }).code(400);
    }

    const patient_id = requestData[0].Patient_id;

    // Cek apakah kombinasi Coass_id dan Patient_id sudah ada di tabel Schedules
    const [existingSchedule] = await pool.query(
        `SELECT * FROM Schedules WHERE Patient_id = ?`,
        [patient_id]
    );

    if (existingSchedule.length > 0) {
        return h.response({ message: 'Anda sudah menjadwalkan pasien ini.' }).code(400);
    }

    // Insert ke tabel Schedules jika validasi berhasil
    await pool.query(
        `INSERT INTO Schedules (Request_id, Coass_id, Patient_id, Appointment_date, Appointment_place) VALUES (?, ?, ?, ?, ?)`,
        [request_id, coass_id, patient_id, appointment_date, appointment_place]
    );

    return h.response({ message: 'Meeting scheduled successfully.' }).code(201);
};


const getPatientSchedule = async (request, h) => {
    const patient_id = request.auth.credentials.id;

    try {
        const query = `
            SELECT 
                s.Schedule_id, 
                s.Appointment_date, 
                s.Appointment_place, 
                u.Img_profile AS Coass_Img, 
                u.Name AS Coass_name, 
                u.Phone AS Coass_phone, 
                u.University AS Coass_university,
                r.Img_disease, 
                r.Disease_name, 
                r.Description
            FROM Schedules s
            JOIN Users u ON s.Coass_id = u.Id
            JOIN Requests r ON s.Request_id = r.Request_id
            WHERE s.Patient_id = ?
        `;

        const [schedules] = await pool.query(query, [patient_id]);

        return h.response(schedules).code(200);
    } catch (error) {
        console.error('GET /my-schedule Error:', error.message);
        return h.response({ message: 'Internal Server Error' }).code(500);
    }
};

const getCoassSchedule = async (request, h) => {
    const coass_id = request.auth.credentials.id;

    try {
        const query = `
            SELECT 
                Schedules.Schedule_id, 
                Schedules.Appointment_date, 
                Schedules.Appointment_place, 
                Patients.Name AS Patient_name, 
                Patients.Phone AS Patient_phone, 
                Patients.Gender AS Patient_gender, 
                Requests.Img_disease, 
                Requests.Disease_name, 
                Requests.Description
            FROM Schedules
            JOIN Users AS Patients ON Schedules.Patient_id = Patients.Id
            LEFT JOIN Requests ON Requests.Patient_id = Patients.Id
            WHERE Schedules.Coass_id = ?
        `;

        const [schedules] = await pool.query(query, [coass_id]);

        return h.response(schedules).code(200);
    } catch (error) {
        console.error('GET /coass-schedule Error:', error.message);
        return h.response({ message: 'Internal Server Error' }).code(500);
    }
};

module.exports = { scheduleMeeting, getPatientSchedule, getCoassSchedule, verifyRole };
